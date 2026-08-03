import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

// lectures.controller.ts now calls achievement.service.ts (evaluateCourseCompletion), which logs
// through config/logger.ts -> config/env.ts — env vars must exist before that first import.
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let Course: typeof import('../models/course.model').Course
let lectures: typeof import('../modules/lectures/lectures.controller')
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ Course } = await import('../models/course.model'))
  lectures = await import('../modules/lectures/lectures.controller')
  ;({ invokeMiddleware, mockReq } = await import('./testHttp'))
  ;({ connectTestDb, disconnectTestDb, clearTestDb } = await import('./testDb'))
  await connectTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

function fakeUser(role: 'student' | 'instructor' | 'admin' = 'student') {
  return { _id: new Types.ObjectId(), role }
}

async function createCourseWithEnrollment(studentId: Types.ObjectId) {
  return Course.create({
    name: 'Systems Thinking',
    createdBy: new Types.ObjectId(),
    modules: [
      {
        title: 'Module 1',
        order: 0,
        moduleItems: [
          { title: 'Welcome', type: 'markdown', order: 0, content: '# Hi', isPreview: false },
          { title: 'Deep dive', type: 'pdf', order: 1, url: 'https://example.com/a.pdf', isPreview: false },
        ],
      },
    ],
    enrollments: [{ user: studentId, enrolledAs: 'student', completedItems: [] }],
  })
}

describe('GET /courses/:courseId/lectures/:moduleItemId', () => {
  it('returns item detail with completion state for an enrolled student', async () => {
    const student = fakeUser()
    const course = await createCourseWithEnrollment(student._id)
    const itemId = course.modules[0]!.moduleItems[0]!._id.toString()

    const { res } = await invokeMiddleware(
      lectures.getModuleItem,
      mockReq({ params: { courseId: course._id.toString(), moduleItemId: itemId }, user: student })
    )

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome', completed: false }))
  })

  it('allows a global admin to view content without a per-course enrollment', async () => {
    const admin = fakeUser('admin')
    const course = await createCourseWithEnrollment(new Types.ObjectId())
    const itemId = course.modules[0]!.moduleItems[0]!._id.toString()

    const { res, next } = await invokeMiddleware(
      lectures.getModuleItem,
      mockReq({ params: { courseId: course._id.toString(), moduleItemId: itemId }, user: admin })
    )

    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ completed: false }))
  })

  it('rejects a user with no enrollment on the course', async () => {
    const outsider = fakeUser()
    const course = await createCourseWithEnrollment(new Types.ObjectId())
    const itemId = course.modules[0]!.moduleItems[0]!._id.toString()

    const { next } = await invokeMiddleware(
      lectures.getModuleItem,
      mockReq({ params: { courseId: course._id.toString(), moduleItemId: itemId }, user: outsider })
    )

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })

  it('404s for a module item id that does not exist on the course', async () => {
    const student = fakeUser()
    const course = await createCourseWithEnrollment(student._id)

    const { next } = await invokeMiddleware(
      lectures.getModuleItem,
      mockReq({
        params: { courseId: course._id.toString(), moduleItemId: new Types.ObjectId().toString() },
        user: student,
      })
    )

    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 404 })
  })
})

describe('POST /courses/:courseId/lectures/:moduleItemId/complete', () => {
  it('marks an item complete and returns updated progress', async () => {
    const student = fakeUser()
    const course = await createCourseWithEnrollment(student._id)
    const itemId = course.modules[0]!.moduleItems[0]!._id.toString()
    const req = mockReq({ params: { courseId: course._id.toString(), moduleItemId: itemId }, user: student })

    const { res } = await invokeMiddleware(lectures.markComplete, req)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ completedCount: 1, totalCount: 2, percent: 50 })
    )
  })

  it('is idempotent under repeated completion of the same item', async () => {
    const student = fakeUser()
    const course = await createCourseWithEnrollment(student._id)
    const itemId = course.modules[0]!.moduleItems[0]!._id.toString()
    const buildReq = () =>
      mockReq({ params: { courseId: course._id.toString(), moduleItemId: itemId }, user: student })

    await invokeMiddleware(lectures.markComplete, buildReq())
    const { res } = await invokeMiddleware(lectures.markComplete, buildReq())

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ completedCount: 1 }))
  })

  it('reflects as completed on a subsequent item fetch', async () => {
    const student = fakeUser()
    const course = await createCourseWithEnrollment(student._id)
    const itemId = course.modules[0]!.moduleItems[0]!._id.toString()
    const buildReq = () =>
      mockReq({ params: { courseId: course._id.toString(), moduleItemId: itemId }, user: student })

    await invokeMiddleware(lectures.markComplete, buildReq())
    const { res } = await invokeMiddleware(lectures.getModuleItem, buildReq())

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ completed: true }))
  })

  it('issues a certificate once completing this item finishes the course (no other requirements)', async () => {
    const { Achievement } = await import('../models/achievement.model')
    const student = fakeUser()
    const course = await Course.create({
      name: 'One Lesson Course',
      createdBy: new Types.ObjectId(),
      modules: [
        {
          title: 'Module 1',
          order: 0,
          moduleItems: [{ title: 'Only lesson', type: 'markdown', order: 0, content: 'x', isPreview: false }],
        },
      ],
      assessments: [],
      enrollments: [{ user: student._id, enrolledAs: 'student', completedItems: [] }],
    })
    const itemId = course.modules[0]!.moduleItems[0]!._id.toString()

    await invokeMiddleware(
      lectures.markComplete,
      mockReq({ params: { courseId: course._id.toString(), moduleItemId: itemId }, user: student })
    )

    expect(await Achievement.countDocuments({ course: course._id, user: student._id })).toBe(1)
  })
})

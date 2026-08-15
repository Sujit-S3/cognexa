import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

// courses.controller.ts pulls in user.model.ts, which imports config/env.ts directly — env vars
// must exist before that first import, so set them and defer the imports under test (Pattern B).
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let Course: typeof import('../models/course.model').Course
let User: typeof import('../models/user.model').User
let courses: typeof import('../modules/courses/courses.controller')
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ Course } = await import('../models/course.model'))
  ;({ User } = await import('../models/user.model'))
  courses = await import('../modules/courses/courses.controller')
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

async function createUser(role: 'student' | 'instructor' | 'admin' = 'student') {
  const suffix = new Types.ObjectId().toString()
  return User.create({
    username: `user-${suffix}`,
    name: 'Test User',
    email: `user-${suffix}@example.com`,
    password: 'correct horse battery staple',
    mobile: '555-010-1234',
    role,
    enrollments: [],
  })
}

async function createCourse(overrides: Record<string, unknown> = {}) {
  return Course.create({
    name: 'Systems Thinking',
    createdBy: new Types.ObjectId(),
    status: 'published',
    modules: [],
    enrollments: [],
    ...overrides,
  })
}

describe('getAllCourses', () => {
  it('returns only published courses, with a public-safe shape, when unauthenticated', async () => {
    await createCourse({ status: 'published', name: 'Published course' })
    await createCourse({ status: 'draft', name: 'Draft course' })

    const { res } = await invokeMiddleware(courses.getAllCourses, mockReq())

    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as Array<{
      name: string
      enrollments?: unknown
    }>
    expect(body).toHaveLength(1)
    expect(body[0]!.name).toBe('Published course')
    expect(body[0]!).not.toHaveProperty('enrollments')
  })

  it('returns privileged course views (including drafts) for an authenticated instructor', async () => {
    const instructor = await createUser('instructor')
    await createCourse({ status: 'draft', createdBy: instructor._id, name: 'My draft' })

    const { res } = await invokeMiddleware(
      courses.getAllCourses,
      mockReq({ user: { _id: instructor._id, role: instructor.role } })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as Array<{
      name: string
    }>
    expect(body.some((c) => c.name === 'My draft')).toBe(true)
  })

  it('strips lesson content/urls from a published course for an authenticated user with no enrollment', async () => {
    const outsider = await createUser('student')
    await createCourse({
      status: 'published',
      name: 'Paid course',
      modules: [
        {
          title: 'Module 1',
          order: 0,
          moduleItems: [
            {
              title: 'Intro video',
              type: 'youtube',
              order: 0,
              url: 'https://youtube.com/watch?v=secret',
              isPreview: false,
            },
          ],
        },
      ],
    })

    const { res } = await invokeMiddleware(
      courses.getAllCourses,
      mockReq({ user: { _id: outsider._id, role: outsider.role } })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as Array<{
      name: string
      modules: Array<{ moduleItems: Array<Record<string, unknown>> }>
    }>
    const paidCourse = body.find((c) => c.name === 'Paid course')!
    expect(paidCourse.modules[0]!.moduleItems[0]).not.toHaveProperty('url')
    expect(paidCourse.modules[0]!.moduleItems[0]).toMatchObject({ title: 'Intro video', type: 'youtube' })
  })

  it('keeps full lesson content/urls for a user actually enrolled in the course', async () => {
    const student = await createUser('student')
    await createCourse({
      status: 'published',
      name: 'Enrolled course',
      modules: [
        {
          title: 'Module 1',
          order: 0,
          moduleItems: [
            {
              title: 'Intro video',
              type: 'youtube',
              order: 0,
              url: 'https://youtube.com/watch?v=secret',
              isPreview: false,
            },
          ],
        },
      ],
      enrollments: [{ user: student._id, enrolledAs: 'student', completedItems: [] }],
    })

    const { res } = await invokeMiddleware(
      courses.getAllCourses,
      mockReq({ user: { _id: student._id, role: student.role } })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as Array<{
      name: string
      modules: Array<{ moduleItems: Array<Record<string, unknown>> }>
    }>
    const enrolledCourse = body.find((c) => c.name === 'Enrolled course')!
    expect(enrolledCourse.modules[0]!.moduleItems[0]).toMatchObject({
      url: 'https://youtube.com/watch?v=secret',
    })
  })
})

describe('getOneCourse', () => {
  it('404s an unpublished course for an anonymous visitor', async () => {
    const course = await createCourse({ status: 'draft' })
    const { next } = await invokeMiddleware(
      courses.getOneCourse,
      mockReq({ params: { courseId: course._id.toString() } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 404 })
  })

  it('shows an enrolled student the public shape plus their progress', async () => {
    const student = await createUser('student')
    const course = await createCourse({
      status: 'published',
      enrollments: [{ user: student._id, enrolledAs: 'student', completedItems: [] }],
    })

    const { res } = await invokeMiddleware(
      courses.getOneCourse,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
      })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      enrolled: boolean
      progress: unknown
      enrollments?: unknown
    }
    expect(body.progress).not.toBeNull()
    expect(body).not.toHaveProperty('enrollments')
    // serializePublicCourse hardcodes enrolled: false for the anonymous/public shape it's shared
    // with — the enrolled-student branch must override it, or the frontend's course.enrolled-
    // gated lesson/assessment links (CourseDetailPage.tsx) never become clickable for a real
    // enrolled learner. Caught live in a manual smoke test; this pins the fix.
    expect(body.enrolled).toBe(true)
  })

  it('reports enrolled:false for a published course a logged-in user is not enrolled in', async () => {
    const outsider = await createUser('student')
    const course = await createCourse({ status: 'published' })

    const { res } = await invokeMiddleware(
      courses.getOneCourse,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: outsider._id, role: outsider.role },
      })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      enrolled: boolean
      progress: unknown
    }
    expect(body.enrolled).toBe(false)
    expect(body.progress).toBeNull()
  })

  it('shows the full document (including the enrollment roster) to the owning instructor', async () => {
    const instructor = await createUser('instructor')
    const course = await createCourse({
      status: 'draft',
      createdBy: instructor._id,
      enrollments: [{ user: instructor._id, enrolledAs: 'instructor', completedItems: [] }],
    })

    const { res } = await invokeMiddleware(
      courses.getOneCourse,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
      })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      enrollments: unknown[]
    }
    expect(body.enrollments).toHaveLength(1)
  })
})

describe('createCourse', () => {
  it('creates a draft course, enrolls the creator as instructor, and returns their course list', async () => {
    const instructor = await createUser('instructor')

    const { res } = await invokeMiddleware(
      courses.createCourse,
      mockReq({ user: instructor, body: { courseName: 'New Course' } })
    )
    expect(res.status).toHaveBeenCalledWith(201)

    const stored = await Course.findOne({ name: 'New Course' })
    expect(stored).not.toBeNull()
    expect(stored!.status).toBe('draft')
    expect(stored!.enrollments).toHaveLength(1)
    expect(stored!.enrollments[0]!.enrolledAs).toBe('instructor')

    const refreshedUser = await User.findById(instructor._id)
    expect(refreshedUser!.enrollments.map((id) => id.toString())).toContain(stored!._id.toString())
  })

  it('rejects a course with no name', async () => {
    const instructor = await createUser('instructor')
    const { next } = await invokeMiddleware(courses.createCourse, mockReq({ user: instructor, body: {} }))
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 400 })
  })
})

describe('updateCourse / deleteCourse / endCourse', () => {
  it('rejects an update from a user with no role on the course', async () => {
    const outsider = await createUser('student')
    const course = await createCourse()
    const { next } = await invokeMiddleware(
      courses.updateCourse,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: outsider._id, role: outsider.role },
        body: { name: 'Hacked name' },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })

  it('allows the owning instructor to update course fields', async () => {
    const instructor = await createUser('instructor')
    const course = await createCourse({
      createdBy: instructor._id,
      enrollments: [{ user: instructor._id, enrolledAs: 'instructor', completedItems: [] }],
    })

    const { res } = await invokeMiddleware(
      courses.updateCourse,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
        body: { name: 'Renamed course' },
      })
    )
    expect(res.json).toHaveBeenCalled()
    expect((await Course.findById(course._id))!.name).toBe('Renamed course')
  })

  it('deleteCourse removes the course and un-enrolls every member', async () => {
    const instructor = await createUser('instructor')
    const student = await createUser('student')
    student.enrollments.push(new Types.ObjectId())
    const course = await createCourse({
      createdBy: instructor._id,
      enrollments: [
        { user: instructor._id, enrolledAs: 'instructor', completedItems: [] },
        { user: student._id, enrolledAs: 'student', completedItems: [] },
      ],
    })
    student.enrollments = [course._id]
    await student.save()

    const { res } = await invokeMiddleware(
      courses.deleteCourse,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
      })
    )
    expect(res.status).toHaveBeenCalledWith(204)
    expect(await Course.findById(course._id)).toBeNull()

    const refreshedStudent = await User.findById(student._id)
    expect(refreshedStudent!.enrollments).toHaveLength(0)
  })

  it('endCourse archives the course without deleting it', async () => {
    const instructor = await createUser('instructor')
    const course = await createCourse({
      createdBy: instructor._id,
      status: 'published',
      enrollments: [{ user: instructor._id, enrolledAs: 'instructor', completedItems: [] }],
    })

    const { res } = await invokeMiddleware(
      courses.endCourse,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
      })
    )
    expect(res.status).toHaveBeenCalledWith(204)
    expect((await Course.findById(course._id))!.status).toBe('archived')
  })
})

describe('enroll / unEnroll / getEnrollments / updateEnrollment', () => {
  it('lets a student self-enroll in a published course', async () => {
    const student = await createUser('student')
    const course = await createCourse({ status: 'published' })

    await invokeMiddleware(
      courses.enroll,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
        body: {},
      })
    )

    const updated = await Course.findById(course._id)
    expect(updated!.enrollments.some((e) => e.user.toString() === student._id.toString())).toBe(true)
    const refreshedStudent = await User.findById(student._id)
    expect(refreshedStudent!.enrollments.map((id) => id.toString())).toContain(course._id.toString())
  })

  it('never creates two enrollment entries for the same user under concurrent enroll requests', async () => {
    const student = await createUser('student')
    const course = await createCourse({ status: 'published' })
    const buildReq = () =>
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
        body: {},
      })

    // Two "concurrent" requests racing the same read-check-write path — before the atomic fix,
    // both could read the course before either wrote, and both would then succeed.
    const results = await Promise.all([
      invokeMiddleware(courses.enroll, buildReq()),
      invokeMiddleware(courses.enroll, buildReq()),
    ])

    const statusCodes = results.map(
      ({ next }) => next.mock.calls[0]?.[0] as { statusCode?: number } | undefined
    )
    const failures = statusCodes.filter(Boolean)
    expect(failures).toHaveLength(1)
    expect(failures[0]).toMatchObject({ statusCode: 409 })

    const updated = await Course.findById(course._id)
    const matchingEnrollments = updated!.enrollments.filter(
      (e) => e.user.toString() === student._id.toString()
    )
    expect(matchingEnrollments).toHaveLength(1)
  })

  it('rejects self-enrollment in an unpublished course', async () => {
    const student = await createUser('student')
    const course = await createCourse({ status: 'draft' })

    const { next } = await invokeMiddleware(
      courses.enroll,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
        body: {},
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })

  it('rejects one student enrolling another student', async () => {
    const student = await createUser('student')
    const target = await createUser('student')
    const course = await createCourse({ status: 'published' })

    const { next } = await invokeMiddleware(
      courses.enroll,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
        body: { userId: target._id.toString() },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })

  it('lets a managing instructor enroll another user, who is privileged as a student unless they own the course or are a global admin', async () => {
    const instructor = await createUser('instructor')
    const anotherInstructor = await createUser('instructor')
    const admin = await createUser('admin')
    const course = await createCourse({
      createdBy: instructor._id,
      status: 'published',
      enrollments: [{ user: instructor._id, enrolledAs: 'instructor', completedItems: [] }],
    })

    await invokeMiddleware(
      courses.enroll,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
        body: { userId: anotherInstructor._id.toString() },
      })
    )
    await invokeMiddleware(
      courses.enroll,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
        body: { userId: admin._id.toString() },
      })
    )

    const updated = await Course.findById(course._id)
    const enrollment = updated!.enrollments.find(
      (e) => e.user.toString() === anotherInstructor._id.toString()
    )
    // Being a global instructor does not by itself grant course-level instructor privilege —
    // only the course's own creator (or a global admin) gets more than 'student' on enrollment.
    expect(enrollment?.enrolledAs).toBe('student')
    const adminEnrollment = updated!.enrollments.find((e) => e.user.toString() === admin._id.toString())
    expect(adminEnrollment?.enrolledAs).toBe('admin')
  })

  it('unEnroll removes the enrollment from both the course and the user', async () => {
    const student = await createUser('student')
    const course = await createCourse({
      status: 'published',
      enrollments: [{ user: student._id, enrolledAs: 'student', completedItems: [] }],
    })
    student.enrollments = [course._id]
    await student.save()

    await invokeMiddleware(
      courses.unEnroll,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
        body: {},
      })
    )

    const updated = await Course.findById(course._id)
    expect(updated!.enrollments).toHaveLength(0)
    const refreshedStudent = await User.findById(student._id)
    expect(refreshedStudent!.enrollments).toHaveLength(0)
  })

  it('unEnroll rejects a user who is not enrolled with a structured 409, not a generic 500', async () => {
    const student = await createUser('student')
    const course = await createCourse({ status: 'published' })

    const { next } = await invokeMiddleware(
      courses.unEnroll,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
        body: {},
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 409 })
  })

  it('getEnrollments is restricted to course managers', async () => {
    const instructor = await createUser('instructor')
    const student = await createUser('student')
    const course = await createCourse({
      createdBy: instructor._id,
      enrollments: [
        { user: instructor._id, enrolledAs: 'instructor', completedItems: [] },
        { user: student._id, enrolledAs: 'student', completedItems: [] },
      ],
    })

    const { next } = await invokeMiddleware(
      courses.getEnrollments,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: student._id, role: student.role },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })

    const { res } = await invokeMiddleware(
      courses.getEnrollments,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
      })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as unknown[]
    expect(body).toHaveLength(2)
  })

  it("updateEnrollment lets a manager change a member's course-level role", async () => {
    const instructor = await createUser('instructor')
    const student = await createUser('student')
    const course = await createCourse({
      createdBy: instructor._id,
      enrollments: [
        { user: instructor._id, enrolledAs: 'instructor', completedItems: [] },
        { user: student._id, enrolledAs: 'student', completedItems: [] },
      ],
    })
    const enrollmentId = course.enrollments.find((e) => e.user.toString() === student._id.toString())!._id

    await invokeMiddleware(
      courses.updateEnrollment,
      mockReq({
        params: { courseId: course._id.toString() },
        user: { _id: instructor._id, role: instructor.role },
        body: { enrollmentId: enrollmentId.toString(), enrolledAs: 'instructor' },
      })
    )

    const updated = await Course.findById(course._id)
    const enrollment = updated!.enrollments.id(enrollmentId)
    expect(enrollment!.enrolledAs).toBe('instructor')
  })
})

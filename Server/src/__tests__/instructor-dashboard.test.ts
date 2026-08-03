import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let Course: typeof import('../models/course.model').Course
let AssessmentSubmission: typeof import('../models/assessmentSubmission.model').AssessmentSubmission
let getSubmissionsQueue: typeof import('../modules/instructor/instructor.controller').getSubmissionsQueue
let gradeSubmission: typeof import('../modules/instructor/instructor.controller').gradeSubmission
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ Course } = await import('../models/course.model'))
  ;({ AssessmentSubmission } = await import('../models/assessmentSubmission.model'))
  ;({ getSubmissionsQueue, gradeSubmission } = await import('../modules/instructor/instructor.controller'))
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

function fakeUser(role: 'student' | 'instructor' | 'admin' = 'instructor') {
  return { _id: new Types.ObjectId(), role }
}

async function createCourseWithAssignment(instructorId: Types.ObjectId, studentId: Types.ObjectId) {
  return Course.create({
    name: 'Systems Thinking',
    createdBy: instructorId,
    modules: [],
    assessments: [
      {
        kind: 'assignment',
        title: 'Reflection essay',
        order: 0,
        visibility: 'published',
        passingScore: 60,
        randomizeQuestions: false,
        randomizeAnswers: false,
        submissionLimit: 1,
        questions: [],
        attachments: [],
        rubric: [
          { title: 'Clarity', points: 6 },
          { title: 'Depth', points: 4 },
        ],
      },
    ],
    enrollments: [
      { user: instructorId, enrolledAs: 'instructor', completedItems: [] },
      { user: studentId, enrolledAs: 'student', completedItems: [] },
    ],
  })
}

describe('instructor submission grading', () => {
  it('lists only submitted/graded assignment submissions in the queue', async () => {
    const instructor = fakeUser()
    const student = fakeUser('student')
    const course = await createCourseWithAssignment(instructor._id, student._id)
    const assignment = course.assessments[0]!

    await AssessmentSubmission.create({
      course: course._id,
      courseAssessmentId: assignment._id,
      kind: 'assignment',
      student: student._id,
      status: 'in_progress',
      attemptNumber: 1,
      text: 'still writing',
      assessmentTitleSnapshot: assignment.title,
      startedAt: new Date(),
    })
    const submitted = await AssessmentSubmission.create({
      course: course._id,
      courseAssessmentId: assignment._id,
      kind: 'assignment',
      student: student._id,
      status: 'submitted',
      attemptNumber: 1,
      text: 'final answer',
      assessmentTitleSnapshot: assignment.title,
      startedAt: new Date(),
      submittedAt: new Date(),
    })

    const { body } = await invokeMiddleware<Array<{ id: string }>>(
      getSubmissionsQueue,
      mockReq({ params: { courseId: course._id.toString() }, user: instructor })
    )

    expect(body).toHaveLength(1)
    expect(body[0]!.id).toBe(submitted._id.toString())
  })

  it('grades a submission from rubric scores, deriving score/maxScore/passed', async () => {
    const instructor = fakeUser()
    const student = fakeUser('student')
    const course = await createCourseWithAssignment(instructor._id, student._id)
    const assignment = course.assessments[0]!
    const criteria = assignment.rubric

    const submission = await AssessmentSubmission.create({
      course: course._id,
      courseAssessmentId: assignment._id,
      kind: 'assignment',
      student: student._id,
      status: 'submitted',
      attemptNumber: 1,
      text: 'final answer',
      assessmentTitleSnapshot: assignment.title,
      startedAt: new Date(),
      submittedAt: new Date(),
    })

    const { body } = await invokeMiddleware<{
      status: string
      score: number
      maxScore: number
      passed: boolean
    }>(
      gradeSubmission,
      mockReq({
        params: { courseId: course._id.toString(), submissionId: submission._id.toString() },
        user: instructor,
        body: {
          rubricScores: [
            { criterionId: criteria[0]!._id!.toString(), points: 5 },
            { criterionId: criteria[1]!._id!.toString(), points: 4 },
          ],
          feedback: 'Solid work.',
        },
      })
    )

    expect(body.status).toBe('graded')
    expect(body.score).toBe(9)
    expect(body.maxScore).toBe(10)
    expect(body.passed).toBe(true)
  })

  it('rejects grading from an instructor who does not manage the course', async () => {
    const owner = fakeUser()
    const outsider = fakeUser()
    const student = fakeUser('student')
    const course = await createCourseWithAssignment(owner._id, student._id)
    const assignment = course.assessments[0]!

    const submission = await AssessmentSubmission.create({
      course: course._id,
      courseAssessmentId: assignment._id,
      kind: 'assignment',
      student: student._id,
      status: 'submitted',
      attemptNumber: 1,
      assessmentTitleSnapshot: assignment.title,
      startedAt: new Date(),
      submittedAt: new Date(),
    })

    const { next } = await invokeMiddleware(
      gradeSubmission,
      mockReq({
        params: { courseId: course._id.toString(), submissionId: submission._id.toString() },
        user: outsider,
        body: {},
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })
})

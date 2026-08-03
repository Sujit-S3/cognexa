import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let Course: typeof import('../models/course.model').Course
let Achievement: typeof import('../models/achievement.model').Achievement
let Notification: typeof import('../models/notification.model').Notification
let evaluateCourseCompletion: typeof import('../services/achievement.service').evaluateCourseCompletion
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ Course } = await import('../models/course.model'))
  ;({ Achievement } = await import('../models/achievement.model'))
  ;({ Notification } = await import('../models/notification.model'))
  ;({ evaluateCourseCompletion } = await import('../services/achievement.service'))
  ;({ connectTestDb, disconnectTestDb, clearTestDb } = await import('./testDb'))
  await connectTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

async function createCourse(studentId: Types.ObjectId) {
  return Course.create({
    name: 'Systems Thinking',
    createdBy: new Types.ObjectId(),
    modules: [
      {
        title: 'Module 1',
        order: 0,
        moduleItems: [
          { title: 'Lesson 1', type: 'markdown', order: 0, content: 'x', isPreview: false },
          { title: 'Lesson 2', type: 'markdown', order: 1, content: 'y', isPreview: false },
        ],
      },
    ],
    assessments: [
      {
        kind: 'quiz',
        title: 'Checkpoint',
        order: 0,
        visibility: 'published',
        passingScore: 70,
        randomizeQuestions: false,
        randomizeAnswers: false,
        submissionLimit: 2,
        questions: [{ prompt: 'x', type: 'mcq', options: ['a', 'b'], correctAnswers: ['a'], points: 1 }],
        attachments: [],
        rubric: [],
      },
    ],
    enrollments: [{ user: studentId, enrolledAs: 'student', completedItems: [] }],
  })
}

describe('evaluateCourseCompletion', () => {
  it('does not issue an achievement while lessons remain incomplete', async () => {
    const student = new Types.ObjectId()
    const course = await createCourse(student)

    await evaluateCourseCompletion(course, student)

    expect(await Achievement.countDocuments({ course: course._id, user: student })).toBe(0)
  })

  it('does not issue an achievement while a published assessment is unpassed', async () => {
    const student = new Types.ObjectId()
    const course = await createCourse(student)
    course.modules[0]!.moduleItems.forEach((item) => {
      course.enrollments[0]!.completedItems.push(item._id)
    })
    await course.save()

    await evaluateCourseCompletion(course, student)

    expect(await Achievement.countDocuments({ course: course._id, user: student })).toBe(0)
  })

  it('issues exactly one achievement with a certificate code once every requirement is met', async () => {
    const { AssessmentSubmission } = await import('../models/assessmentSubmission.model')
    const student = new Types.ObjectId()
    const course = await createCourse(student)
    course.modules[0]!.moduleItems.forEach((item) => {
      course.enrollments[0]!.completedItems.push(item._id)
    })
    await course.save()

    await AssessmentSubmission.create({
      course: course._id,
      courseAssessmentId: course.assessments[0]!._id,
      kind: 'quiz',
      student,
      status: 'graded',
      attemptNumber: 1,
      score: 1,
      maxScore: 1,
      passed: true,
      startedAt: new Date(),
      submittedAt: new Date(),
      assessmentTitleSnapshot: 'Checkpoint',
    })

    await evaluateCourseCompletion(course, student)

    const achievements = await Achievement.find({ course: course._id, user: student })
    expect(achievements).toHaveLength(1)
    expect(achievements[0]!.certificate).toMatch(/^CGX-/)
    expect(achievements[0]!.gradeLetter).toBe('A')

    const notifications = await Notification.find({ user: student, type: 'certificate_issued' })
    expect(notifications).toHaveLength(1)
  })

  it('is idempotent — re-evaluating an already-achieved course does not create a second record', async () => {
    const { AssessmentSubmission } = await import('../models/assessmentSubmission.model')
    const student = new Types.ObjectId()
    const course = await createCourse(student)
    course.modules[0]!.moduleItems.forEach((item) => {
      course.enrollments[0]!.completedItems.push(item._id)
    })
    await course.save()
    await AssessmentSubmission.create({
      course: course._id,
      courseAssessmentId: course.assessments[0]!._id,
      kind: 'quiz',
      student,
      status: 'graded',
      attemptNumber: 1,
      score: 1,
      maxScore: 1,
      passed: true,
      startedAt: new Date(),
      submittedAt: new Date(),
      assessmentTitleSnapshot: 'Checkpoint',
    })

    await evaluateCourseCompletion(course, student)
    await evaluateCourseCompletion(course, student)

    expect(await Achievement.countDocuments({ course: course._id, user: student })).toBe(1)
  })
})

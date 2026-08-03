import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

// assessments.controller.ts now calls achievement.service.ts (evaluateCourseCompletion), which
// logs through config/logger.ts -> config/env.ts — env vars must exist before that first import.
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let Course: typeof import('../models/course.model').Course
let AssessmentSubmission: typeof import('../models/assessmentSubmission.model').AssessmentSubmission
let assessments: typeof import('../modules/assessments/assessments.controller')
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ Course } = await import('../models/course.model'))
  ;({ AssessmentSubmission } = await import('../models/assessmentSubmission.model'))
  assessments = await import('../modules/assessments/assessments.controller')
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

interface SubmissionBody {
  id: string
  kind: string
  status: string
  score?: number
  maxScore?: number
  passed?: boolean
  text?: string
  presentedQuestions: Array<Record<string, unknown> & { questionId: string; prompt: string }>
  questionResults: Array<{ correct: boolean }>
  answerKey?: Array<{ questionId: string; correctAnswers: string[]; explanation?: string }>
}

async function createCourseWithAssessments(studentId: Types.ObjectId) {
  return Course.create({
    name: 'Systems Thinking',
    createdBy: new Types.ObjectId(),
    modules: [],
    assessments: [
      {
        kind: 'quiz',
        title: 'Checkpoint quiz',
        order: 0,
        visibility: 'published',
        passingScore: 70,
        randomizeQuestions: false,
        randomizeAnswers: false,
        submissionLimit: 2,
        questions: [
          {
            prompt: '2 + 2 = ?',
            type: 'mcq',
            options: ['3', '4'],
            correctAnswers: ['4'],
            explanation: 'Basic addition.',
            points: 1,
          },
          {
            prompt: 'Capital of France?',
            type: 'fill_blank',
            options: [],
            correctAnswers: ['Paris'],
            points: 1,
          },
        ],
        attachments: [],
        rubric: [],
      },
      {
        kind: 'assignment',
        title: 'Reflection essay',
        order: 1,
        visibility: 'published',
        instructions: 'Write a short reflection.',
        dueDate: new Date(Date.now() + 86_400_000),
        passingScore: 60,
        randomizeQuestions: false,
        randomizeAnswers: false,
        submissionLimit: 1,
        questions: [],
        attachments: [],
        rubric: [{ title: 'Clarity', points: 10 }],
      },
      {
        kind: 'quiz',
        title: 'Draft quiz (unpublished)',
        order: 2,
        visibility: 'draft',
        passingScore: 70,
        randomizeQuestions: false,
        randomizeAnswers: false,
        submissionLimit: 1,
        questions: [{ prompt: 'x', type: 'mcq', options: ['a'], correctAnswers: ['a'], points: 1 }],
        attachments: [],
        rubric: [],
      },
    ],
    enrollments: [{ user: studentId, enrolledAs: 'student', completedItems: [] }],
  })
}

describe('quiz attempt lifecycle', () => {
  it('starts an attempt, freezes questions without leaking the answer key', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const quiz = course.assessments[0]!

    const { body } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })
    )

    expect(body.status).toBe('in_progress')
    expect(body.presentedQuestions).toHaveLength(2)
    body.presentedQuestions.forEach((question) => {
      expect(question).not.toHaveProperty('correctAnswers')
      expect(question).not.toHaveProperty('explanation')
    })
  })

  it('returns the same in-progress attempt on a second start call instead of creating a duplicate', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const quiz = course.assessments[0]!
    const req = () =>
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })

    await invokeMiddleware(assessments.startAttempt, req())
    await invokeMiddleware(assessments.startAttempt, req())

    const count = await AssessmentSubmission.countDocuments({ course: course._id, student: student._id })
    expect(count).toBe(1)
  })

  it('auto-grades a submitted quiz correctly and records per-question results', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const quiz = course.assessments[0]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })
    )
    const mcqQuestion = started.presentedQuestions.find((q) => q.prompt.includes('2 + 2'))!
    const fillBlankQuestion = started.presentedQuestions.find((q) => q.prompt.includes('Capital'))!

    const { body: graded } = await invokeMiddleware<SubmissionBody>(
      assessments.submitSubmission,
      mockReq({
        params: { submissionId: started.id },
        user: student,
        body: {
          answers: [
            { questionId: mcqQuestion.questionId, response: ['4'] },
            { questionId: fillBlankQuestion.questionId, response: ['paris'] },
          ],
        },
      })
    )

    expect(graded.status).toBe('graded')
    expect(graded.score).toBe(2)
    expect(graded.maxScore).toBe(2)
    expect(graded.passed).toBe(true)
    expect(graded.questionResults.every((result) => result.correct)).toBe(true)
  })

  it('issues a certificate once passing this quiz finishes the course (no other requirements)', async () => {
    const { Achievement } = await import('../models/achievement.model')
    const student = fakeUser()
    const course = await Course.create({
      name: 'Quiz-only course',
      createdBy: new Types.ObjectId(),
      modules: [],
      assessments: [
        {
          kind: 'quiz',
          title: 'Only quiz',
          order: 0,
          visibility: 'published',
          passingScore: 70,
          randomizeQuestions: false,
          randomizeAnswers: false,
          submissionLimit: 1,
          questions: [{ prompt: 'x', type: 'mcq', options: ['a', 'b'], correctAnswers: ['a'], points: 1 }],
          attachments: [],
          rubric: [],
        },
      ],
      enrollments: [{ user: student._id, enrolledAs: 'student', completedItems: [] }],
    })
    const quiz = course.assessments[0]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })
    )
    const question = started.presentedQuestions[0]!

    await invokeMiddleware(
      assessments.submitSubmission,
      mockReq({
        params: { submissionId: started.id },
        user: student,
        body: { answers: [{ questionId: question.questionId, response: ['a'] }] },
      })
    )

    expect(await Achievement.countDocuments({ course: course._id, user: student._id })).toBe(1)
  })

  it('grades a wrong answer as incorrect and reflects it in the pass/fail outcome', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const quiz = course.assessments[0]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })
    )
    const mcqQuestion = started.presentedQuestions.find((q) => q.prompt.includes('2 + 2'))!

    const { body: graded } = await invokeMiddleware<SubmissionBody>(
      assessments.submitSubmission,
      mockReq({
        params: { submissionId: started.id },
        user: student,
        body: { answers: [{ questionId: mcqQuestion.questionId, response: ['3'] }] },
      })
    )

    expect(graded.score).toBe(0)
    expect(graded.passed).toBe(false)
  })

  it('reveals the answer key with explanations once a quiz submission is graded', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const quiz = course.assessments[0]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })
    )
    const mcqQuestion = started.presentedQuestions.find((q) => q.prompt.includes('2 + 2'))!

    const { body: graded } = await invokeMiddleware<SubmissionBody>(
      assessments.submitSubmission,
      mockReq({
        params: { submissionId: started.id },
        user: student,
        body: { answers: [{ questionId: mcqQuestion.questionId, response: ['3'] }] },
      })
    )

    const revealedMcq = graded.answerKey?.find(
      (entry) => entry.questionId.toString() === mcqQuestion.questionId.toString()
    )
    expect(revealedMcq).toMatchObject({ correctAnswers: ['4'], explanation: 'Basic addition.' })

    const { body: fetched } = await invokeMiddleware<SubmissionBody>(
      assessments.getSubmission,
      mockReq({ params: { submissionId: started.id }, user: student })
    )
    expect(
      fetched.answerKey?.find((entry) => entry.questionId.toString() === mcqQuestion.questionId.toString())
    ).toMatchObject({
      correctAnswers: ['4'],
    })
  })

  it('does not include an answer key while a quiz attempt is still in progress', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const quiz = course.assessments[0]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })
    )

    const { body: fetched } = await invokeMiddleware<SubmissionBody>(
      assessments.getSubmission,
      mockReq({ params: { submissionId: started.id }, user: student })
    )
    expect(fetched.answerKey).toBeUndefined()
  })

  it('rejects starting an attempt once the submission limit is used up', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const quiz = course.assessments[0]! // submissionLimit: 2

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { body: started } = await invokeMiddleware<SubmissionBody>(
        assessments.startAttempt,
        mockReq({
          params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
          user: student,
        })
      )
      await invokeMiddleware(
        assessments.submitSubmission,
        mockReq({ params: { submissionId: started.id }, user: student, body: { answers: [] } })
      )
    }

    const { next } = await invokeMiddleware(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() },
        user: student,
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 409 })
  })

  it('hides a draft (unpublished) assessment from learners', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const draftQuiz = course.assessments[2]!

    const { next } = await invokeMiddleware(
      assessments.getAssessmentForLearner,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: draftQuiz._id.toString() },
        user: student,
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 404 })
  })

  it("prevents a learner from accessing another learner's submission", async () => {
    const owner = fakeUser()
    const intruder = fakeUser()
    const course = await createCourseWithAssessments(owner._id)
    const quiz = course.assessments[0]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({ params: { courseId: course._id.toString(), assessmentId: quiz._id.toString() }, user: owner })
    )

    const { next } = await invokeMiddleware(
      assessments.updateSubmission,
      mockReq({ params: { submissionId: started.id }, user: intruder, body: { answers: [] } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })
})

describe('assignment submission lifecycle', () => {
  it('saves a draft, submits without auto-grading, and stays gradable by an instructor', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const assignment = course.assessments[1]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: assignment._id.toString() },
        user: student,
      })
    )
    expect(started.kind).toBe('assignment')

    await invokeMiddleware(
      assessments.updateSubmission,
      mockReq({ params: { submissionId: started.id }, user: student, body: { text: 'Draft text' } })
    )

    const { body: submitted } = await invokeMiddleware<SubmissionBody>(
      assessments.submitSubmission,
      mockReq({ params: { submissionId: started.id }, user: student, body: { text: 'Final text' } })
    )
    expect(submitted.status).toBe('submitted')
    expect(submitted.text).toBe('Final text')
    expect(submitted.score).toBeUndefined()
  })

  it('rejects further edits to a submission that has already been submitted', async () => {
    const student = fakeUser()
    const course = await createCourseWithAssessments(student._id)
    const assignment = course.assessments[1]!

    const { body: started } = await invokeMiddleware<SubmissionBody>(
      assessments.startAttempt,
      mockReq({
        params: { courseId: course._id.toString(), assessmentId: assignment._id.toString() },
        user: student,
      })
    )
    await invokeMiddleware(
      assessments.submitSubmission,
      mockReq({ params: { submissionId: started.id }, user: student, body: {} })
    )

    const { next } = await invokeMiddleware(
      assessments.updateSubmission,
      mockReq({ params: { submissionId: started.id }, user: student, body: { text: 'too late' } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 409 })
  })
})

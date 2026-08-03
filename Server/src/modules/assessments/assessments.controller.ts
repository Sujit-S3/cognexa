import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { Course, CourseDocument } from '../../models/course.model'
import { AssessmentSubmission } from '../../models/assessmentSubmission.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { assertCourseRole } from '../../utils/courseAccess'
import { evaluateCourseCompletion } from '../../services/achievement.service'
import { gradeQuizAttempt, maybeShuffleOptions, selectAttemptQuestions } from './assessments.grading'

// Only ever called once an attempt is graded and over — the answer key is safe to reveal at
// that point, unlike at attempt-start where presentedQuestions deliberately excludes it.
function buildAnswerKey(course: CourseDocument, courseAssessmentId: Types.ObjectId) {
  const assessment = course.assessments.id(courseAssessmentId)
  if (!assessment) return []
  return assessment.questions.map((question) => ({
    questionId: question._id,
    correctAnswers: question.correctAnswers,
    explanation: question.explanation,
  }))
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000
  )
}

async function requireOwnedSubmission(req: Request) {
  const submission = await AssessmentSubmission.findById(req.params.submissionId).orFail(
    () => new AppError(404, 'Submission not found')
  )
  if (submission.student.toString() !== req.user!._id.toString()) {
    throw new AppError(403, "You cannot access another learner's submission")
  }
  return submission
}

function applyDraftFields(submission: InstanceType<typeof AssessmentSubmission>, body: Request['body']) {
  if (submission.kind === 'quiz' && body.answers) {
    submission.answers = body.answers
  }
  if (submission.kind === 'assignment') {
    if (body.text !== undefined) submission.text = body.text
    if (body.attachments !== undefined) submission.attachments = body.attachments
  }
}

export const getAssessmentForLearner = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['student', 'instructor', 'admin'])

  const { assessmentId } = req.params
  if (!assessmentId) throw new AppError(400, 'Missing assessment id')
  const assessment = course.assessments.id(assessmentId)
  if (!assessment || assessment.visibility !== 'published') {
    throw new AppError(404, 'Assessment not found')
  }

  const [latestSubmission, attemptsUsed] = await Promise.all([
    AssessmentSubmission.findOne({
      course: course._id,
      courseAssessmentId: assessment._id,
      student: req.user!._id,
    }).sort({ createdAt: -1 }),
    AssessmentSubmission.countDocuments({
      course: course._id,
      courseAssessmentId: assessment._id,
      student: req.user!._id,
      status: { $ne: 'in_progress' },
    }),
  ])

  const { questions, ...assessmentJson } = assessment.toJSON() as Record<string, unknown> & {
    questions?: unknown[]
  }

  res.json({
    assessment: { ...assessmentJson, questionCount: questions?.length ?? 0 },
    submission: latestSubmission,
    attemptsUsed,
    attemptsAllowed: assessment.submissionLimit,
  })
})

export const startAttempt = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['student', 'instructor', 'admin'])

  const { assessmentId } = req.params
  if (!assessmentId) throw new AppError(400, 'Missing assessment id')
  const assessment = course.assessments.id(assessmentId)
  if (!assessment || assessment.visibility !== 'published') {
    throw new AppError(404, 'Assessment not found')
  }

  const attemptQuery = {
    course: course._id,
    courseAssessmentId: assessment._id,
    student: req.user!._id,
  }

  const existingAttempt = await AssessmentSubmission.findOne({ ...attemptQuery, status: 'in_progress' })
  if (existingAttempt) {
    res.json(existingAttempt)
    return
  }

  const attemptsUsed = await AssessmentSubmission.countDocuments({
    ...attemptQuery,
    status: { $ne: 'in_progress' },
  })
  if (attemptsUsed >= assessment.submissionLimit) {
    throw new AppError(409, 'You have used all allowed attempts for this assessment')
  }

  const base = {
    ...attemptQuery,
    kind: assessment.kind,
    status: 'in_progress' as const,
    attemptNumber: attemptsUsed + 1,
    assessmentTitleSnapshot: assessment.title,
    startedAt: new Date(),
  }

  const payload =
    assessment.kind === 'quiz'
      ? {
          ...base,
          presentedQuestions: selectAttemptQuestions(assessment.questions, {
            questionPoolSize: assessment.questionPoolSize,
            randomizeQuestions: assessment.randomizeQuestions,
          }).map((question) => ({
            questionId: question._id,
            prompt: question.prompt,
            type: question.type,
            options: maybeShuffleOptions(question.options, assessment.randomizeAnswers),
            points: question.points,
          })),
          answers: [],
          timeLimitExpiresAt: assessment.timeLimitMinutes
            ? new Date(Date.now() + assessment.timeLimitMinutes * 60_000)
            : undefined,
        }
      : { ...base, text: '', attachments: [] }

  try {
    const created = await AssessmentSubmission.create(payload)
    res.status(201).json(created)
  } catch (error) {
    // A concurrent request may have created the in-progress attempt first — the partial unique
    // index guarantees at most one exists, so surface that one instead of a raw 500.
    if (isDuplicateKeyError(error)) {
      const winner = await AssessmentSubmission.findOne({ ...attemptQuery, status: 'in_progress' })
      if (winner) {
        res.json(winner)
        return
      }
    }
    throw error
  }
})

export const updateSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await requireOwnedSubmission(req)
  if (submission.status !== 'in_progress') {
    throw new AppError(409, 'This submission has already been submitted and can no longer be edited')
  }

  applyDraftFields(submission, req.body)
  await submission.save()
  res.json(submission)
})

export const submitSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await requireOwnedSubmission(req)
  if (submission.status !== 'in_progress') {
    res.json(submission)
    return
  }

  applyDraftFields(submission, req.body)

  const course = await Course.findById(submission.course).orFail(() => new AppError(404, 'Course not found'))
  const assessment = course.assessments.id(submission.courseAssessmentId)
  if (!assessment) throw new AppError(409, 'This assessment is no longer available')

  submission.submittedAt = new Date()

  if (submission.kind === 'quiz') {
    const graded = gradeQuizAttempt(
      assessment.questions,
      submission.answers.map((answer) => ({
        questionId: answer.questionId.toString(),
        response: answer.response,
      })),
      assessment.passingScore
    )
    submission.score = graded.score
    submission.maxScore = graded.maxScore
    submission.passed = graded.passed
    submission.questionResults = graded.results.map((result) => ({
      questionId: result.questionId,
      correct: result.correct,
      pointsAwarded: result.pointsAwarded,
      pointsPossible: result.pointsPossible,
    })) as unknown as typeof submission.questionResults
    submission.status = 'graded'
    submission.gradedAt = new Date()
  } else {
    submission.status = 'submitted'
  }

  await submission.save()
  if (submission.status === 'graded') await evaluateCourseCompletion(course, submission.student)

  const payload = submission.toJSON() as Record<string, unknown>
  if (submission.status === 'graded' && submission.kind === 'quiz') {
    payload.answerKey = buildAnswerKey(course, submission.courseAssessmentId)
  }
  res.json(payload)
})

export const getSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await AssessmentSubmission.findById(req.params.submissionId).orFail(
    () => new AppError(404, 'Submission not found')
  )
  const isOwner = submission.student.toString() === req.user!._id.toString()
  const revealsAnswerKey = submission.kind === 'quiz' && submission.status === 'graded'

  let course: CourseDocument | undefined
  if (!isOwner || revealsAnswerKey) {
    course = await Course.findById(submission.course).orFail(() => new AppError(404, 'Course not found'))
    if (!isOwner) assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])
  }

  const payload = submission.toJSON() as Record<string, unknown>
  if (course && revealsAnswerKey) {
    payload.answerKey = buildAnswerKey(course, submission.courseAssessmentId)
  }
  res.json(payload)
})

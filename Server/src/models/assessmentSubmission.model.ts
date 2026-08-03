import mongoose, { HydratedDocument, Schema, Types } from 'mongoose'
import { BuilderQuestionType, UploadedAssetAttrs, uploadedAssetSchema } from './course.model'
import { idTransform } from '../utils/mongoTransform'

export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded'
export type SubmissionKind = 'quiz' | 'assignment'

// Frozen snapshot of a question at attempt-start — deliberately excludes correctAnswers/
// explanation so the answer key never reaches the browser, and freezes randomized
// question/answer order so a page refresh mid-attempt doesn't re-roll it.
export interface PresentedQuestionAttrs {
  questionId: Types.ObjectId
  prompt: string
  type: BuilderQuestionType
  options: string[]
  points: number
}

const presentedQuestionSchema = new Schema<PresentedQuestionAttrs>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    prompt: { type: String, required: true },
    type: {
      type: String,
      enum: ['mcq', 'multiple_select', 'true_false', 'fill_blank'],
      required: true,
    },
    options: [{ type: String }],
    points: { type: Number, required: true },
  },
  { _id: false }
)

export interface SubmissionAnswerAttrs {
  questionId: Types.ObjectId
  response: string[]
}

const submissionAnswerSchema = new Schema<SubmissionAnswerAttrs>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    response: [{ type: String, maxlength: 2_000 }],
  },
  { _id: false }
)

export interface RubricScoreAttrs {
  criterionId: Types.ObjectId
  points: number
}

const rubricScoreSchema = new Schema<RubricScoreAttrs>(
  {
    criterionId: { type: Schema.Types.ObjectId, required: true },
    points: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

// Per-question outcome of auto-grading — lets the learner see what they got right/wrong without
// storing a second copy of the answer key (correctAnswers/explanation stay out of this document).
export interface QuestionResultAttrs {
  questionId: Types.ObjectId
  correct: boolean
  pointsAwarded: number
  pointsPossible: number
}

const questionResultSchema = new Schema<QuestionResultAttrs>(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    correct: { type: Boolean, required: true },
    pointsAwarded: { type: Number, required: true, min: 0 },
    pointsPossible: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

export interface AssessmentSubmissionAttrs {
  course: Types.ObjectId
  courseAssessmentId: Types.ObjectId
  kind: SubmissionKind
  student: Types.ObjectId
  status: SubmissionStatus
  attemptNumber: number

  // Quiz-only
  presentedQuestions: Types.DocumentArray<PresentedQuestionAttrs>
  answers: Types.DocumentArray<SubmissionAnswerAttrs>
  timeLimitExpiresAt?: Date

  // Assignment-only
  text?: string
  attachments: UploadedAssetAttrs[]
  rubricScores: Types.DocumentArray<RubricScoreAttrs>

  // Shared grading outcome
  score?: number
  maxScore?: number
  passed?: boolean
  feedback?: string
  gradedBy?: Types.ObjectId
  gradedAt?: Date
  questionResults: Types.DocumentArray<QuestionResultAttrs>

  startedAt: Date
  submittedAt?: Date

  // Receipts survive later edits/deletion of the authored assessment.
  assessmentTitleSnapshot: string
}

export type AssessmentSubmissionDocument = HydratedDocument<AssessmentSubmissionAttrs>

const assessmentSubmissionSchema = new Schema<AssessmentSubmissionAttrs>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseAssessmentId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ['quiz', 'assignment'], required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['in_progress', 'submitted', 'graded'], default: 'in_progress' },
    attemptNumber: { type: Number, required: true, min: 1, default: 1 },

    presentedQuestions: [presentedQuestionSchema],
    answers: [submissionAnswerSchema],
    timeLimitExpiresAt: Date,

    text: { type: String, maxlength: 50_000 },
    attachments: [uploadedAssetSchema],
    rubricScores: [rubricScoreSchema],

    score: { type: Number, min: 0 },
    maxScore: { type: Number, min: 0 },
    passed: Boolean,
    feedback: { type: String, maxlength: 10_000 },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: Date,
    questionResults: [questionResultSchema],

    startedAt: { type: Date, required: true, default: Date.now },
    submittedAt: Date,

    assessmentTitleSnapshot: { type: String, required: true },
  },
  { timestamps: true }
)

assessmentSubmissionSchema.index({ course: 1, courseAssessmentId: 1, student: 1, status: 1 })
assessmentSubmissionSchema.index({ student: 1, submittedAt: -1 })
// At most one active attempt per learner per assessment — enforced at the database level, not
// just in application code, so a race between two requests can never create two in-progress
// attempts for the same (course, assessment, student).
assessmentSubmissionSchema.index(
  { course: 1, courseAssessmentId: 1, student: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' } }
)

assessmentSubmissionSchema.set('toJSON', { transform: idTransform })

export const AssessmentSubmission = mongoose.model('AssessmentSubmission', assessmentSubmissionSchema)

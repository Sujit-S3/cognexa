import mongoose, { HydratedDocument, Schema, Types } from 'mongoose'
import { DateTime } from 'luxon'
import { idTransform } from '../utils/mongoTransform'

const options = { discriminatorKey: 'type' }

export type AssessmentType = 'Exam' | 'Assignment'

export interface AssessmentAttrs {
  type: AssessmentType
  createdBy: Types.ObjectId
  files: Array<{ name?: string; url: string }>
  title: string
  maxScore: number
  weight: number
  questionsType: 'online' | 'file'
  submissionType: 'online' | 'written'
  course: Types.ObjectId
  visiblity: 'published' | 'unpublished'
  questions: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

export type AssessmentDocument = HydratedDocument<AssessmentAttrs>

const assessmentSchema = new Schema<AssessmentAttrs>(
  {
    type: { type: String, enum: ['Exam', 'Assignment'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    files: [{ name: String, url: { type: String, required: true } }],
    title: { type: String, required: true },
    maxScore: { type: Number, required: true },
    weight: { type: Number, required: true },
    questionsType: { type: String, enum: ['online', 'file'], required: true },
    submissionType: { type: String, enum: ['online', 'written'], required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    visiblity: { type: String, enum: ['published', 'unpublished'], default: 'published' },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }]
  },
  { ...options, timestamps: true }
)

assessmentSchema
  .virtual('status')
  .get(function (this: HydratedDocument<AssessmentAttrs & { openAt?: Date; closeAt?: Date }>) {
    if (this.openAt && Date.now() < this.openAt.getTime()) {
      return {
        code: 'willOpen',
        message: `assessment will open at ${DateTime.fromJSDate(this.openAt).toLocaleString(DateTime.DATETIME_FULL)}`
      }
    }
    if (this.closeAt && this.closeAt.getTime() < Date.now()) {
      return {
        code: 'closed',
        message: `assessment closed at ${DateTime.fromJSDate(this.closeAt).toLocaleString(DateTime.DATETIME_FULL)}`
      }
    }
    if (this.closeAt && Date.now() < this.closeAt.getTime()) {
      return {
        code: 'open',
        message: `assessment will close at ${DateTime.fromJSDate(this.closeAt).toLocaleString(DateTime.DATETIME_FULL)}`
      }
    }
    return { code: 'open', message: 'assessment is open' }
  })

assessmentSchema.set('toJSON', { virtuals: true, transform: idTransform })

export const Assessment = mongoose.model('Assessment', assessmentSchema)

const examSchema = new Schema({
  openAt: { type: Date, required: true },
  closeAt: { type: Date, required: true }
})

examSchema.virtual('timeLimit').get(function (this: { closeAt: Date; openAt: Date }) {
  return (this.closeAt.getTime() - this.openAt.getTime()) / 1000
})
examSchema.virtual('remainingTime').get(function (this: { closeAt: Date }) {
  return (this.closeAt.getTime() - Date.now()) / 1000
})
examSchema.set('toJSON', { virtuals: true })

export const Exam = Assessment.discriminator('Exam', examSchema)

const assignmentSchema = new Schema({
  dueDate: { type: Date, required: true }
})
assignmentSchema.set('toJSON', { virtuals: true })

export const AssessmentAssignment = Assessment.discriminator('Assignment', assignmentSchema)

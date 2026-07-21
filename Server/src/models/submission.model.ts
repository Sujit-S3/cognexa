import mongoose, { HydratedDocument, Schema, Types } from 'mongoose'
import { Duration } from 'luxon'
import { GradesSummary } from './gradesSummary.model'
import { idTransform } from '../utils/mongoTransform'

export type PlagiarismStatus = 'processing' | 'unCalculated' | 'none' | 'med' | 'high' | 'veryHigh'

export interface SubmissionFile {
  name?: string
  url: string
  plagarismFileStatus: PlagiarismStatus
  plagiarisedFrom?: string
  text: string
}

export interface SubmissionAnswer {
  originQuestion: Types.ObjectId
  studentAnswer: string
  score?: number
}

export interface SubmissionAttrs {
  files: Types.DocumentArray<SubmissionFile>
  course: Types.ObjectId
  assessment: Types.ObjectId
  plagarismStatus: PlagiarismStatus
  autoGradingStatus: 'processing' | 'unGraded' | 'Graded'
  student: Types.ObjectId
  finished?: boolean
  score?: number
  gradedAt?: Date
  numberOfExamJoins: number
  gradedBy?: Types.ObjectId
  submittedAt?: Date
  answers: Types.DocumentArray<SubmissionAnswer>
}

export type SubmissionDocument = HydratedDocument<SubmissionAttrs>

const submissionSchema = new Schema<SubmissionAttrs>({
  files: [
    {
      name: String,
      url: { type: String, required: true },
      plagarismFileStatus: {
        type: String,
        enum: ['processing', 'unCalculated', 'none', 'med', 'high', 'veryHigh'],
        default: 'unCalculated',
      },
      plagiarisedFrom: { type: String },
      text: { type: String, default: '' },
    },
  ],
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  assessment: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  plagarismStatus: {
    type: String,
    enum: ['processing', 'unCalculated', 'none', 'med', 'high', 'veryHigh'],
    default: 'unCalculated',
  },
  autoGradingStatus: { type: String, enum: ['processing', 'unGraded', 'Graded'], default: 'unGraded' },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  finished: { type: Boolean },
  score: { type: Number },
  gradedAt: { type: Date },
  numberOfExamJoins: { type: Number, required: true, default: 0 },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  submittedAt: { type: Date },
  answers: [
    {
      _id: false,
      originQuestion: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
      studentAnswer: { type: String, required: true },
      score: { type: Number },
    },
  ],
})

submissionSchema.pre('deleteMany', async function (next) {
  const filter = this.getFilter()
  const parent = await GradesSummary.findOne({ course: filter.course })
  if (parent) {
    for (const student of parent.studentGrades) {
      student.grades.pull({ _id: filter.assessment })
    }
    await parent.save()
  }
  next()
})

submissionSchema.virtual('status').get(function (
  this: HydratedDocument<SubmissionAttrs & { assessment: { type?: string; dueDate?: Date } }>
) {
  if (!this.assessment || this.assessment.type === 'Exam') return undefined
  if (!this.submittedAt || !this.assessment.dueDate) return undefined

  const timeDifference = this.submittedAt.getTime() - this.assessment.dueDate.getTime()

  if (timeDifference <= 0) {
    return {
      code: 'onTime',
      message: `by ${Duration.fromMillis(Math.abs(timeDifference)).toFormat('hh:mm')} hours & minutes`,
    }
  }
  return {
    code: 'late',
    message: `by ${Duration.fromMillis(timeDifference).toFormat('hh:mm')} hours & minutes`,
  }
})

submissionSchema.set('toJSON', { virtuals: true, transform: idTransform })

export const Submission = mongoose.model('Submission', submissionSchema)

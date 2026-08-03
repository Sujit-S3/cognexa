import mongoose, { Schema, Types } from 'mongoose'
import { stripInternalTransform } from '../utils/mongoTransform'

export interface AchievementAttrs {
  user: Types.ObjectId
  course: Types.ObjectId
  score: string
  gradeLetter: string
  finishedAt: Date
  certificate?: string
}

const achievementSchema = new Schema<AchievementAttrs>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  score: { type: String, required: true },
  gradeLetter: { type: String, required: true },
  finishedAt: { type: Date, required: true, default: Date.now },
  certificate: { type: String },
})

achievementSchema.index({ course: 1, user: 1 })
// `certificate` holds the public verification code (e.g. CGX-...), generated once at issuance —
// unique so the public verify-by-code lookup is always unambiguous.
achievementSchema.index({ certificate: 1 }, { unique: true, sparse: true })

achievementSchema.set('toJSON', { virtuals: true, transform: stripInternalTransform })
achievementSchema.set('toObject', { virtuals: true, transform: stripInternalTransform })

export const Achievement = mongoose.model('Achievement', achievementSchema)

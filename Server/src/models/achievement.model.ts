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

achievementSchema.set('toJSON', { virtuals: true, transform: stripInternalTransform })
achievementSchema.set('toObject', { virtuals: true, transform: stripInternalTransform })

export const Achievement = mongoose.model('Achievement', achievementSchema)

import mongoose, { HydratedDocument, Schema, Types } from 'mongoose'
import { idTransform } from '../utils/mongoTransform'

export type NotificationType = 'quiz_graded' | 'assignment_graded' | 'certificate_issued'

export interface NotificationAttrs {
  user: Types.ObjectId
  type: NotificationType
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: Date
}

export type NotificationDocument = HydratedDocument<NotificationAttrs>

const notificationSchema = new Schema<NotificationAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['quiz_graded', 'assignment_graded', 'certificate_issued'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 2_000 },
    link: { type: String, maxlength: 2_048 },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

notificationSchema.set('toJSON', { transform: idTransform })

export const Notification = mongoose.model('Notification', notificationSchema)

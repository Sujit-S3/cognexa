import mongoose, { Schema, Types } from 'mongoose'

export type NotificationType = 'follow' | 'comment' | 'like' | 'admin' | 'alert' | 'bookmark'

export interface NotificationAttrs {
  to: Types.ObjectId
  type: NotificationType
  priority: number
  read: boolean
  data?: string
}

const notificationSchema = new Schema<NotificationAttrs>(
  {
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['follow', 'comment', 'like', 'admin', 'alert', 'bookmark'], required: true },
    priority: { type: Number, default: 0 },
    read: { type: Boolean, default: false },
    data: { type: String },
  },
  { timestamps: true }
)

export const Notification = mongoose.model('Notification', notificationSchema)

export interface NotificationSubscriptionAttrs {
  user: Types.ObjectId
  subData: Record<string, unknown>
}

const notificationSubscriptionSchema = new Schema<NotificationSubscriptionAttrs>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subData: { type: Object, required: true },
})

export const NotificationSubscription = mongoose.model(
  'NotificationSubscription',
  notificationSubscriptionSchema
)

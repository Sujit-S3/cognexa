import { Types } from 'mongoose'
import { Notification, NotificationDocument, NotificationType } from '../models/notification.model'

export interface CreateNotificationInput {
  user: Types.ObjectId | string
  type: NotificationType
  title: string
  body: string
  link?: string
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationDocument> {
  return Notification.create(input)
}

import webpush from 'web-push'
import { Types } from 'mongoose'
import { env, isPushConfigured } from '../config/env'
import { logger } from '../config/logger'
import { NotificationSubscription } from '../models/notification.model'
import { Notification, NotificationType } from '../models/notification.model'

let configured = false

function ensureConfigured(): boolean {
  if (!isPushConfigured) return false
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_CONTACT_EMAIL, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!)
    configured = true
  }
  return true
}

// Persists an in-app notification and best-effort delivers a browser push if the user is
// subscribed. Push delivery failures are logged, not thrown — a missing/expired subscription
// should never fail the calling request.
export async function pushNotification(
  userId: Types.ObjectId | string,
  payload: { title: string },
  type: NotificationType = 'alert'
): Promise<void> {
  await Notification.create({ to: userId, type, data: payload.title })

  if (!ensureConfigured()) return

  const subscriptions = await NotificationSubscription.find({ user: userId }).exec()
  await Promise.all(
    subscriptions.map((subscription) =>
      webpush.sendNotification(subscription.subData as never, JSON.stringify(payload)).catch((err) => {
        logger.warn({ err }, 'Web push delivery failed')
      })
    )
  )
}

export function isWebPushConfigured(): boolean {
  return isPushConfigured
}

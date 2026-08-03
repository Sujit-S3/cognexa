import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import * as notifications from './notifications.controller'
import { notificationParamsSchema } from './notifications.validation'

export const notificationRouter = Router()

notificationRouter.use(authenticate)

notificationRouter.get('/', notifications.getNotifications)
notificationRouter.get('/unread-count', notifications.getUnreadCount)
notificationRouter.post(
  '/:notificationId/read',
  validate({ params: notificationParamsSchema }),
  notifications.markAsRead
)
notificationRouter.post('/read-all', notifications.markAllAsRead)

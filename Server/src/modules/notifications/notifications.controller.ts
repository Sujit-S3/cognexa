import { Request, Response } from 'express'
import { Notification } from '../../models/notification.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  // _id as a secondary sort key breaks ties deterministically when two notifications are created
  // within the same createdAt millisecond (ObjectIds are monotonically increasing per-process).
  const notifications = await Notification.find({ user: req.user!._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(50)
  res.set('cache-control', 'private, no-store').json(notifications)
})

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await Notification.countDocuments({ user: req.user!._id, read: false })
  res.set('cache-control', 'private, no-store').json({ count })
})

// Scoping the filter to the caller's own user id (not just the notification id) means a learner
// can never mark — or even discover the existence of — another learner's notification.
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params
  if (!notificationId) throw new AppError(400, 'Missing notification id')

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: req.user!._id },
    { $set: { read: true } },
    { new: true }
  )
  if (!notification) throw new AppError(404, 'Notification not found')
  res.json(notification)
})

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ user: req.user!._id, read: false }, { $set: { read: true } })
  res.status(204).end()
})

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'
import { Notification } from '../models/notification.model'
import * as notifications from '../modules/notifications/notifications.controller'
import { invokeMiddleware, mockReq } from './testHttp'
import { clearTestDb, connectTestDb, disconnectTestDb } from './testDb'

beforeAll(connectTestDb)
afterEach(clearTestDb)
afterAll(disconnectTestDb)

function fakeUser() {
  return { _id: new Types.ObjectId(), role: 'student' as const }
}

describe('GET /notifications', () => {
  it("lists only the caller's own notifications, most recent first", async () => {
    const user = fakeUser()
    const stranger = fakeUser()
    await Notification.create([
      { user: user._id, type: 'certificate_issued', title: 'First', body: 'x', read: false },
      { user: user._id, type: 'quiz_graded', title: 'Second', body: 'x', read: false },
      { user: stranger._id, type: 'quiz_graded', title: 'Not mine', body: 'x', read: false },
    ])

    const { body } = await invokeMiddleware<Array<{ title: string }>>(
      notifications.getNotifications,
      mockReq({ user })
    )

    expect(body.map((n) => n.title)).toEqual(['Second', 'First'])
  })
})

describe('GET /notifications/unread-count', () => {
  it('counts only unread notifications for the caller', async () => {
    const user = fakeUser()
    await Notification.create([
      { user: user._id, type: 'certificate_issued', title: 'a', body: 'x', read: false },
      { user: user._id, type: 'quiz_graded', title: 'b', body: 'x', read: true },
    ])

    const { body } = await invokeMiddleware<{ count: number }>(
      notifications.getUnreadCount,
      mockReq({ user })
    )
    expect(body.count).toBe(1)
  })
})

describe('POST /notifications/:notificationId/read', () => {
  it('marks a notification read', async () => {
    const user = fakeUser()
    const created = await Notification.create({
      user: user._id,
      type: 'certificate_issued',
      title: 'a',
      body: 'x',
      read: false,
    })

    const { body } = await invokeMiddleware<{ read: boolean }>(
      notifications.markAsRead,
      mockReq({ params: { notificationId: created._id.toString() }, user })
    )
    expect(body.read).toBe(true)
  })

  it("cannot mark another user's notification as read", async () => {
    const owner = fakeUser()
    const intruder = fakeUser()
    const created = await Notification.create({
      user: owner._id,
      type: 'certificate_issued',
      title: 'a',
      body: 'x',
      read: false,
    })

    const { next } = await invokeMiddleware(
      notifications.markAsRead,
      mockReq({ params: { notificationId: created._id.toString() }, user: intruder })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 404 })
  })
})

describe('POST /notifications/read-all', () => {
  it('marks every unread notification for the caller as read, leaving others untouched', async () => {
    const user = fakeUser()
    const stranger = fakeUser()
    await Notification.create([
      { user: user._id, type: 'certificate_issued', title: 'a', body: 'x', read: false },
      { user: user._id, type: 'quiz_graded', title: 'b', body: 'x', read: false },
      { user: stranger._id, type: 'quiz_graded', title: 'c', body: 'x', read: false },
    ])

    await invokeMiddleware(notifications.markAllAsRead, mockReq({ user }))

    expect(await Notification.countDocuments({ user: user._id, read: false })).toBe(0)
    expect(await Notification.countDocuments({ user: stranger._id, read: false })).toBe(1)
  })
})

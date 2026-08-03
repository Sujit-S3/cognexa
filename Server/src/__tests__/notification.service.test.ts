import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'
import { Notification } from '../models/notification.model'
import { createNotification } from '../services/notification.service'
import { clearTestDb, connectTestDb, disconnectTestDb } from './testDb'

describe('notification service', () => {
  beforeAll(connectTestDb)
  afterEach(clearTestDb)
  afterAll(disconnectTestDb)

  it('persists a notification for the target user', async () => {
    const userId = new Types.ObjectId()
    const created = await createNotification({
      user: userId,
      type: 'certificate_issued',
      title: 'Certificate ready',
      body: 'Your certificate for Systems Thinking is ready to download.',
      link: '/certificates/verify/CGX-ABC123',
    })

    expect(created.read).toBe(false)
    expect(created.user.toString()).toBe(userId.toString())

    const stored = await Notification.findById(created._id).orFail()
    expect(stored.title).toBe('Certificate ready')
  })

  it('rejects an unsupported notification type', async () => {
    await expect(
      createNotification({
        user: new Types.ObjectId(),
        // @ts-expect-error deliberately invalid for this test
        type: 'course_announcement',
        title: 'x',
        body: 'x',
      })
    ).rejects.toThrow()
  })
})

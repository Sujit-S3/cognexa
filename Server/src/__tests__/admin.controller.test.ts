import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

// admin.controller.ts pulls in user.model.ts, which imports config/env.ts directly — env vars
// must exist before that first import, so set them and defer the imports under test (Pattern B).
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let User: typeof import('../models/user.model').User
let Session: typeof import('../models/session.model').Session
let AuditLog: typeof import('../models/auditLog.model').AuditLog
let admin: typeof import('../modules/admin/admin.controller')
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ User } = await import('../models/user.model'))
  ;({ Session } = await import('../models/session.model'))
  ;({ AuditLog } = await import('../models/auditLog.model'))
  admin = await import('../modules/admin/admin.controller')
  ;({ invokeMiddleware, mockReq } = await import('./testHttp'))
  ;({ connectTestDb, disconnectTestDb, clearTestDb } = await import('./testDb'))
  await connectTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

async function createUser(
  role: 'student' | 'instructor' | 'admin' = 'student',
  overrides: Record<string, unknown> = {}
) {
  const suffix = new Types.ObjectId().toString()
  return User.create({
    username: `user-${suffix}`,
    name: 'Test User',
    email: `user-${suffix}@example.com`,
    password: 'correct horse battery staple',
    mobile: '555-010-1234',
    role,
    ...overrides,
  })
}

function asReqUser(user: Awaited<ReturnType<typeof createUser>>) {
  return { _id: user._id, role: user.role }
}

describe('listUsers', () => {
  it('paginates and searches by name/email/username', async () => {
    const admin1 = await createUser('admin')
    await createUser('student', { name: 'Ada Lovelace', email: 'ada@example.com' })
    await createUser('student', { name: 'Grace Hopper', email: 'grace@example.com' })

    const { res } = await invokeMiddleware<{ users: Array<{ id: string; email: string }>; total: number }>(
      admin.listUsers,
      mockReq({ user: asReqUser(admin1), query: { search: 'ada', page: 1, limit: 20 } })
    )
    expect(res.json).toHaveBeenCalled()
  })

  it('returns an explicit id field even though User.toJSON does not map _id to id', async () => {
    const caller = await createUser('admin')
    const { res } = await invokeMiddleware<{ users: Array<{ id: string }> }>(
      admin.listUsers,
      mockReq({ user: asReqUser(caller), query: { page: 1, limit: 20 } })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      users: Array<{ id: string }>
    }
    expect(body.users.every((u) => typeof u.id === 'string' && u.id.length === 24)).toBe(true)
  })
})

describe('updateUserStatus', () => {
  it('deactivates a user, revokes their sessions, and records an audit event', async () => {
    const caller = await createUser('admin')
    const target = await createUser('student')
    await Session.create({
      user: target._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    })

    const { res } = await invokeMiddleware(
      admin.updateUserStatus,
      mockReq({
        params: { userId: target._id.toString() },
        user: asReqUser(caller),
        body: { isActive: false },
      })
    )
    expect(res.json).toHaveBeenCalled()

    expect((await User.findById(target._id))!.isActive).toBe(false)
    expect(await Session.countDocuments({ user: target._id })).toBe(0)
    const events = await AuditLog.find({ targetId: target._id })
    expect(events).toHaveLength(1)
    expect(events[0]!.action).toBe('user.deactivate')
    expect(events[0]!.actor.toString()).toBe(caller._id.toString())
  })

  it('rejects an admin deactivating their own account', async () => {
    const caller = await createUser('admin')
    const { next } = await invokeMiddleware(
      admin.updateUserStatus,
      mockReq({
        params: { userId: caller._id.toString() },
        user: asReqUser(caller),
        body: { isActive: false },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 400 })
    expect((await User.findById(caller._id))!.isActive).toBe(true)
  })

  it('rejects self-deactivation even when the route param id is a different letter case than the canonical id', async () => {
    const caller = await createUser('admin')
    const { next } = await invokeMiddleware(
      admin.updateUserStatus,
      mockReq({
        params: { userId: caller._id.toString().toUpperCase() },
        user: asReqUser(caller),
        body: { isActive: false },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 400 })
    expect((await User.findById(caller._id))!.isActive).toBe(true)
  })
})

describe('updateUserRole', () => {
  it('changes a user role and records the before/after in the audit event', async () => {
    const caller = await createUser('admin')
    const target = await createUser('student')

    await invokeMiddleware(
      admin.updateUserRole,
      mockReq({
        params: { userId: target._id.toString() },
        user: asReqUser(caller),
        body: { role: 'instructor' },
      })
    )

    expect((await User.findById(target._id))!.role).toBe('instructor')
    const event = await AuditLog.findOne({ targetId: target._id })
    expect(event!.action).toBe('user.role_change')
    expect(event!.metadata).toMatchObject({ from: 'student', to: 'instructor' })
  })

  it('rejects an admin changing their own role', async () => {
    const caller = await createUser('admin')
    const { next } = await invokeMiddleware(
      admin.updateUserRole,
      mockReq({
        params: { userId: caller._id.toString() },
        user: asReqUser(caller),
        body: { role: 'student' },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 400 })
    expect((await User.findById(caller._id))!.role).toBe('admin')
  })

  it('rejects self-role-change even when the route param id is a different letter case than the canonical id', async () => {
    const caller = await createUser('admin')
    const { next } = await invokeMiddleware(
      admin.updateUserRole,
      mockReq({
        params: { userId: caller._id.toString().toUpperCase() },
        user: asReqUser(caller),
        body: { role: 'student' },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 400 })
    expect((await User.findById(caller._id))!.role).toBe('admin')
  })
})

describe('getAuditLog', () => {
  it('defaults to platform-only entries, excluding organization-scoped ones', async () => {
    const caller = await createUser('admin')
    const otherAdmin = await createUser('admin')
    await AuditLog.create({
      actor: caller._id,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: new Types.ObjectId(),
    })
    await AuditLog.create({
      actor: caller._id,
      action: 'org.invite',
      targetType: 'Invitation',
      targetId: new Types.ObjectId(),
      organization: new Types.ObjectId(),
    })

    const { res } = await invokeMiddleware<{
      entries: Array<{ action: string; actor: { id: string; name: string } }>
      total: number
    }>(admin.getAuditLog, mockReq({ user: asReqUser(otherAdmin), query: { page: 1, limit: 50 } }))

    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      entries: Array<{ action: string; actor: { id: string; name: string } }>
      total: number
    }
    expect(body.total).toBe(1)
    expect(body.entries[0]!.action).toBe('user.deactivate')
    expect(body.entries[0]!.actor.id).toBe(caller._id.toString())
    expect(body.entries[0]!.actor.name).toBe(caller.name)
  })

  it('scopes to a specific organization when requested', async () => {
    const caller = await createUser('admin')
    const orgId = new Types.ObjectId()
    await AuditLog.create({
      actor: caller._id,
      action: 'org.invite',
      targetType: 'Invitation',
      targetId: new Types.ObjectId(),
      organization: orgId,
    })
    await AuditLog.create({
      actor: caller._id,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: new Types.ObjectId(),
    })

    const { res } = await invokeMiddleware<{ entries: unknown[]; total: number }>(
      admin.getAuditLog,
      mockReq({
        user: asReqUser(caller),
        query: { organization: orgId.toString(), page: 1, limit: 50 },
      })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      total: number
    }
    expect(body.total).toBe(1)
  })

  it('renders a fallback actor instead of crashing when the actor account was since deleted', async () => {
    const caller = await createUser('admin')
    const deletedActorId = new Types.ObjectId()
    await AuditLog.create({
      actor: deletedActorId,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: new Types.ObjectId(),
    })

    const { res } = await invokeMiddleware<{
      entries: Array<{ actor: { id: string | null; name: string } }>
    }>(admin.getAuditLog, mockReq({ user: asReqUser(caller), query: { page: 1, limit: 50 } }))

    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as {
      entries: Array<{ actor: { id: string | null; name: string } }>
    }
    expect(body.entries[0]!.actor).toEqual({ id: null, name: 'Deleted user', email: '' })
  })
})

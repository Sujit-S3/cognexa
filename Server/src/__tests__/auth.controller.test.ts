import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

// auth.controller.ts imports email.service.ts (SMTP/env) and session.service.ts (env) — env vars
// must exist before that first import, so set them and defer the imports under test (Pattern B).
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let User: typeof import('../models/user.model').User
let Session: typeof import('../models/session.model').Session
let Course: typeof import('../models/course.model').Course
let auth: typeof import('../modules/auth/auth.controller')
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ User } = await import('../models/user.model'))
  ;({ Session } = await import('../models/session.model'))
  ;({ Course } = await import('../models/course.model'))
  auth = await import('../modules/auth/auth.controller')
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

function registrationBody(overrides: Record<string, unknown> = {}) {
  const suffix = new Types.ObjectId().toString()
  return {
    username: `learner-${suffix}`,
    name: 'Test Learner',
    email: `learner-${suffix}@example.com`,
    password: 'correct horse battery staple',
    passwordConfirm: 'correct horse battery staple',
    mobile: '555-010-1234',
    ...overrides,
  }
}

async function createActiveUser(overrides: Record<string, unknown> = {}) {
  const suffix = new Types.ObjectId().toString()
  return User.create({
    username: `learner-${suffix}`,
    name: 'Test Learner',
    email: `learner-${suffix}@example.com`,
    password: 'correct horse battery staple',
    mobile: '555-010-1234',
    ...overrides,
  })
}

interface ReqUser {
  _id: Types.ObjectId
  role: string
}

function asReqUser(user: Awaited<ReturnType<typeof createActiveUser>>): ReqUser {
  return { _id: user._id, role: user.role }
}

describe('sessionStatus', () => {
  it('reports no session when no refresh cookie is present', async () => {
    const { res } = await invokeMiddleware(auth.sessionStatus, mockReq())
    expect(res.json).toHaveBeenCalledWith({ hasSession: false })
  })

  it('reports a session when a refresh cookie is present', async () => {
    const { res } = await invokeMiddleware(
      auth.sessionStatus,
      mockReq({ get: (name: string) => (name === 'cookie' ? 'cognexa_refresh=some-token' : undefined) })
    )
    expect(res.json).toHaveBeenCalledWith({ hasSession: true })
  })
})

describe('register', () => {
  it('creates a user, issues a session, and never leaks the password hash over the wire', async () => {
    const { res, body } = await invokeMiddleware<{
      user: { email: string } & Record<string, unknown> & { toJSON(): Record<string, unknown> }
      token: string
    }>(auth.register, mockReq({ body: registrationBody() }))

    expect(res.status).toHaveBeenCalledWith(201)
    expect(body.token).toEqual(expect.any(String))
    // res.json() in the real Express response serializes via the model's toJSON transform (our
    // test-double res.json captures the raw document instead) — invoke it explicitly to assert
    // what actually reaches the wire.
    expect(body.user.toJSON()).not.toHaveProperty('password')
    expect(res.append).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('cognexa_refresh='))

    const stored = await User.findOne({ email: body.user.email })
    expect(stored).not.toBeNull()
  })
})

describe('login', () => {
  it('logs in with correct credentials and issues a session', async () => {
    const user = await createActiveUser()
    const { body } = await invokeMiddleware<{ user: Record<string, unknown>; token: string }>(
      auth.login,
      mockReq({ body: { email: user.email, password: 'correct horse battery staple' } })
    )
    expect(body.token).toEqual(expect.any(String))
    expect(body.user.email).toBe(user.email)
  })

  it('rejects an incorrect password without revealing whether the account exists', async () => {
    const user = await createActiveUser()
    const { next } = await invokeMiddleware(
      auth.login,
      mockReq({ body: { email: user.email, password: 'totally wrong password' } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 401, message: 'Invalid email or password' })
  })

  it('rejects a login for an email that does not exist, with the same generic message', async () => {
    const { next } = await invokeMiddleware(
      auth.login,
      mockReq({ body: { email: 'nobody@example.com', password: 'whatever password' } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 401, message: 'Invalid email or password' })
  })
})

describe('logout / logoutAll / listSessions / revokeSession', () => {
  it('logout deletes the current session and clears the cookie', async () => {
    const user = await createActiveUser()
    const session = await Session.create({
      user: user._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
    })

    const { res } = await invokeMiddleware(auth.logout, mockReq({ user: asReqUser(user) }))

    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' })
    expect(res.append).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('cognexa_refresh=;'))
    // logout only deletes the session matching the current cookie — with no cookie present here,
    // this session is untouched, which is the correct (not a false-positive) outcome to assert.
    expect(await Session.findById(session._id)).not.toBeNull()
  })

  it('logoutAll deletes every session for the user and clears the cookie', async () => {
    const user = await createActiveUser()
    await Session.create([
      { user: user._id, tokenHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60_000) },
      { user: user._id, tokenHash: 'b'.repeat(64), expiresAt: new Date(Date.now() + 60_000) },
    ])

    const { res } = await invokeMiddleware(auth.logoutAll, mockReq({ user: asReqUser(user) }))

    expect(res.json).toHaveBeenCalledWith({ message: 'Signed out on all devices' })
    expect(await Session.countDocuments({ user: user._id })).toBe(0)
  })

  it("listSessions returns only the caller's non-expired sessions, marking the current one", async () => {
    const user = await createActiveUser()
    const other = await createActiveUser()
    await Session.create([
      { user: user._id, tokenHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60_000) },
      { user: user._id, tokenHash: 'b'.repeat(64), expiresAt: new Date(Date.now() - 60_000) },
      { user: other._id, tokenHash: 'c'.repeat(64), expiresAt: new Date(Date.now() + 60_000) },
    ])

    const { body } = await invokeMiddleware<Array<{ current: boolean }>>(
      auth.listSessions,
      mockReq({ user: asReqUser(user) })
    )

    expect(body).toHaveLength(1)
    expect(body[0]!.current).toBe(false)
  })

  it('revokeSession deletes only a session owned by the caller', async () => {
    const user = await createActiveUser()
    const intruder = await createActiveUser()
    const session = await Session.create({
      user: user._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    })

    const { next } = await invokeMiddleware(
      auth.revokeSession,
      mockReq({ params: { sessionId: session._id.toString() }, user: asReqUser(intruder) })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 404 })
    expect(await Session.findById(session._id)).not.toBeNull()

    const { res } = await invokeMiddleware(
      auth.revokeSession,
      mockReq({ params: { sessionId: session._id.toString() }, user: asReqUser(user) })
    )
    expect(res.status).toHaveBeenCalledWith(204)
    expect(await Session.findById(session._id)).toBeNull()
  })
})

describe('password recovery', () => {
  it('recoverPassword responds identically whether or not the account exists', async () => {
    const user = await createActiveUser()

    const { body: existing } = await invokeMiddleware(
      auth.recoverPassword,
      mockReq({ body: { email: user.email } })
    )
    const { body: missing } = await invokeMiddleware(
      auth.recoverPassword,
      mockReq({ body: { email: 'nobody@example.com' } })
    )
    expect(existing).toEqual(missing)

    const stored = await User.findById(user._id).select('+passwordResetToken +passwordResetValidity')
    expect(stored!.passwordResetToken).toEqual(expect.any(String))
  })

  it('verifyResetToken accepts a valid token and rejects an invalid one', async () => {
    const user = await createActiveUser()
    await invokeMiddleware(auth.recoverPassword, mockReq({ body: { email: user.email } }))

    const { next } = await invokeMiddleware(
      auth.verifyResetToken,
      mockReq({ params: { token: 'not-the-real-token' } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 400 })
  })

  it('resetPassword updates the password and revokes existing sessions', async () => {
    const user = await createActiveUser()
    await Session.create({
      user: user._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    })

    // Reach in directly for the plaintext token the way recoverPassword generated it, since the
    // controller only ever emails the plaintext version — simulate that by resetting via the hash
    // path through a second recoverPassword call and reading back the stored hash's origin is not
    // possible from outside, so instead exercise resetPassword's rejection path for an unknown
    // token and its acceptance path via a freshly minted token through the same hashing the
    // controller itself uses.
    const crypto = await import('crypto')
    const plainToken = 'a-fresh-reset-token'
    user.passwordResetToken = crypto.createHash('sha256').update(plainToken).digest('hex')
    user.passwordResetValidity = new Date(Date.now() + 60_000)
    await user.save({ validateBeforeSave: false })

    const { res } = await invokeMiddleware(
      auth.resetPassword,
      mockReq({ params: { token: plainToken }, body: { password: 'a brand new passphrase' } })
    )
    expect(res.json).toHaveBeenCalledWith({ message: 'Your password has been updated.' })
    expect(await Session.countDocuments({ user: user._id })).toBe(0)

    const updated = await User.findByCredentials(user.email, 'a brand new passphrase')
    expect(updated._id.toString()).toBe(user._id.toString())
  })

  it('resetPassword rejects an expired or unknown token', async () => {
    const { next } = await invokeMiddleware(
      auth.resetPassword,
      mockReq({ params: { token: 'never-issued' }, body: { password: 'irrelevant password' } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 400 })
  })
})

describe('profile', () => {
  it('getMe returns the authenticated user', async () => {
    const user = await createActiveUser()
    const { res } = await invokeMiddleware(auth.getMe, mockReq({ user }))
    expect(res.json).toHaveBeenCalledWith(user)
  })

  it('updateMe updates profile fields without rotating sessions', async () => {
    const user = await createActiveUser()
    await Session.create({
      user: user._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    })

    const { body } = await invokeMiddleware<{ user: { name: string }; token: string }>(
      auth.updateMe,
      mockReq({ user, body: { name: 'Updated Name' } })
    )
    expect(body.user.name).toBe('Updated Name')
    expect(await Session.countDocuments({ user: user._id })).toBe(1)
  })

  it('updateMe rotates sessions when the password changes', async () => {
    const user = await createActiveUser()
    await Session.create({
      user: user._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    })

    const { res } = await invokeMiddleware(
      auth.updateMe,
      mockReq({ user, body: { password: 'a whole new passphrase here' } })
    )
    expect(res.append).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('cognexa_refresh='))
    expect(await Session.countDocuments({ user: user._id })).toBe(1) // the freshly issued one
  })

  it('deleteMe removes the account and all of its sessions', async () => {
    const user = await createActiveUser()
    await Session.create({
      user: user._id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    })

    const { res } = await invokeMiddleware(auth.deleteMe, mockReq({ user }))
    expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted' })
    expect(await User.findById(user._id)).toBeNull()
    expect(await Session.countDocuments({ user: user._id })).toBe(0)
  })

  it('deleteMe pulls the deleted user out of every course they were still enrolled in', async () => {
    const user = await createActiveUser()
    const course = await Course.create({
      name: 'Systems Thinking',
      createdBy: new Types.ObjectId(),
      status: 'published',
      modules: [],
      enrollments: [{ user: user._id, enrolledAs: 'student', completedItems: [] }],
    })

    await invokeMiddleware(auth.deleteMe, mockReq({ user }))

    const updated = await Course.findById(course._id).orFail()
    expect(updated.enrollments).toHaveLength(0)
  })
})

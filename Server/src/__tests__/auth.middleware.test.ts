import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { Request } from 'express'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import { invokeMiddleware } from './testHttp'

// authenticate()/optionalAuthenticate() query the User model, which imports config/env.ts — env
// vars must exist before that first import, so set them and defer the imports under test.
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

type AuthMiddleware = typeof import('../middleware/auth').authenticate

let authenticate: AuthMiddleware
let optionalAuthenticate: AuthMiddleware
let User: typeof import('../models/user.model').User
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ authenticate, optionalAuthenticate } = await import('../middleware/auth'))
  ;({ User } = await import('../models/user.model'))
  ;({ connectTestDb, disconnectTestDb, clearTestDb } = await import('./testDb'))
  await connectTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

function mockReq(token?: string): Request {
  return { get: (name: string) => (name.toLowerCase() === 'authorization' ? token : undefined) } as Request
}

function signAccessToken(userId: Types.ObjectId, overrides: Record<string, unknown> = {}): string {
  return jwt.sign({ sub: userId.toString(), type: 'access', ...overrides }, process.env.SECRET_KEY!, {
    expiresIn: '15m',
  })
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

describe('authenticate', () => {
  it('rejects a request with no bearer token', async () => {
    const { res, next } = await invokeMiddleware(authenticate, mockReq())

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a malformed token instead of throwing', async () => {
    const { res } = await invokeMiddleware(authenticate, mockReq('Bearer not-a-real-jwt'))

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('accepts a valid token for an active user and attaches req.user', async () => {
    const user = await createActiveUser()
    const { req, next } = await invokeMiddleware(authenticate, mockReq(`Bearer ${signAccessToken(user._id)}`))

    expect(next).toHaveBeenCalledWith()
    expect(req.user?._id.toString()).toBe(user._id.toString())
  })

  it('rejects a token for a deactivated user', async () => {
    const user = await createActiveUser({ isActive: false })
    const { res, next } = await invokeMiddleware(authenticate, mockReq(`Bearer ${signAccessToken(user._id)}`))

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a token that was explicitly invalidated (e.g. on logout)', async () => {
    const user = await createActiveUser()
    const signed = signAccessToken(user._id)
    user.invalidatedTokens = [signed]
    await user.save()

    const { res, next } = await invokeMiddleware(authenticate, mockReq(`Bearer ${signed}`))

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects a token issued before the password was last changed', async () => {
    const user = await createActiveUser()
    // Sign as if issued one hour ago, then simulate a password change happening after that.
    const staleToken = signAccessToken(user._id, { iat: Math.floor(Date.now() / 1000) - 3_600 })
    user.password = 'a completely different passphrase'
    await user.save()

    const { res, next } = await invokeMiddleware(authenticate, mockReq(`Bearer ${staleToken}`))

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('optionalAuthenticate', () => {
  it('proceeds anonymously when no token is present', async () => {
    const { req, next } = await invokeMiddleware(optionalAuthenticate, mockReq())

    expect(next).toHaveBeenCalledWith()
    expect(req.user).toBeUndefined()
  })

  it('attaches req.user when a valid token is present', async () => {
    const user = await createActiveUser()
    const { req, next } = await invokeMiddleware(
      optionalAuthenticate,
      mockReq(`Bearer ${signAccessToken(user._id)}`)
    )

    expect(next).toHaveBeenCalledWith()
    expect(req.user?._id.toString()).toBe(user._id.toString())
  })

  it('rejects an invalid token rather than silently proceeding anonymously', async () => {
    const { res, next } = await invokeMiddleware(optionalAuthenticate, mockReq('Bearer garbage'))

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

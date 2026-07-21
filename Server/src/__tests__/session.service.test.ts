import { describe, expect, it } from 'vitest'

process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

describe('refresh session token hashing', () => {
  it('is deterministic without retaining the credential', async () => {
    const { hashRefreshToken } = await import('../services/session.service')
    const token = 'opaque-refresh-token'
    const hash = hashRefreshToken(token)

    expect(hash).toBe(hashRefreshToken(token))
    expect(hash).not.toContain(token)
    expect(hash).toHaveLength(64)
  })
})

describe('access token password timestamp checks', () => {
  it('does not invalidate a registration token issued in the same second', async () => {
    const { passwordChangedAfterIssue } = await import('../middleware/auth')
    expect(passwordChangedAfterIssue(new Date(1_750_000_000_900), 1_750_000_000)).toBe(false)
    expect(passwordChangedAfterIssue(new Date(1_750_000_001_000), 1_750_000_000)).toBe(true)
  })
})

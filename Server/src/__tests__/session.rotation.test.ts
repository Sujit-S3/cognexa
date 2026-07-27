import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findById: vi.fn(),
}))

vi.mock('../models/session.model', () => ({
  Session: {
    findOne: mocks.findOne,
    findOneAndUpdate: mocks.findOneAndUpdate,
  },
}))

vi.mock('../models/user.model', () => ({
  User: {
    findById: mocks.findById,
  },
}))

describe('refresh session rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a token consumed by a concurrent rotation', async () => {
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: 'session-1', user: 'user-1' }),
    })
    mocks.findById.mockResolvedValue({
      _id: 'user-1',
      isActive: true,
      generateAuthToken: vi.fn().mockResolvedValue('access-token'),
    })
    mocks.findOneAndUpdate.mockResolvedValue(null)

    const { rotateSession } = await import('../services/session.service')
    const req = {
      get: vi.fn((header: string) =>
        header === 'cookie' ? 'cognexa_refresh=shared-refresh-token' : undefined
      ),
      ip: '127.0.0.1',
    }
    const res = { append: vi.fn() }

    await expect(rotateSession(req as never, res as never)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Session expired',
    })
    expect(mocks.findOneAndUpdate).toHaveBeenCalledOnce()
    expect(res.append).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('cognexa_refresh=;'))
  })
})

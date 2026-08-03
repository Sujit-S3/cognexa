import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { requireRole } from '../middleware/rbac'
import { AppError } from '../utils/AppError'

function mockReq(role?: string): Request {
  return (role ? { user: { role } } : {}) as unknown as Request
}

describe('requireRole', () => {
  it('proceeds when the user holds one of the allowed roles', () => {
    const next = vi.fn()
    requireRole('admin', 'instructor')(mockReq('instructor'), {} as Response, next as unknown as NextFunction)
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects a role outside the allow-list with a 403 AppError', () => {
    const next = vi.fn()
    requireRole('admin')(mockReq('student'), {} as Response, next as unknown as NextFunction)

    expect(next).toHaveBeenCalledTimes(1)
    const error = next.mock.calls[0]![0] as AppError
    expect(error).toBeInstanceOf(AppError)
    expect(error.statusCode).toBe(403)
  })

  it('rejects when no user is attached to the request', () => {
    const next = vi.fn()
    requireRole('admin')(mockReq(), {} as Response, next as unknown as NextFunction)

    const error = next.mock.calls[0]![0] as AppError
    expect(error.statusCode).toBe(403)
  })
})

import { NextFunction, Request, Response } from 'express'
import { AppError } from '../utils/AppError'
import { UserRole } from '../models/user.model'

// Global-role gate (e.g. admin-only routes). For per-course instructor/ownership checks, use
// utils/courseAccess.ts against the loaded Course document instead — course privilege is
// per-enrollment, not global.
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError(403, 'You do not have permission to perform this action'))
      return
    }
    next()
  }

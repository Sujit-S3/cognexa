import { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError'
import { logger } from '../config/logger'
import { isProduction } from '../config/env'

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` })
}

interface MongoDuplicateKeyError extends Error {
  code: number
  keyValue?: Record<string, unknown>
}

function isDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return Boolean(err) && typeof err === 'object' && (err as { code?: number }).code === 11000
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({ error: 'Validation failed', details: err.flatten() })
    return
  }

  if (err instanceof mongoose.Error.ValidationError) {
    res.status(422).json({ error: 'Validation failed', details: err.errors })
    return
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Invalid ${err.path}: ${String(err.value)}` })
    return
  }

  if (isDuplicateKeyError(err)) {
    res.status(409).json({ error: 'A record with these values already exists', details: err.keyValue })
    return
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message)
    res.status(err.statusCode).json({ error: err.message, details: err.details })
    return
  }

  logger.error({ err, path: req.originalUrl }, 'Unhandled error')
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: isProduction ? 'Internal server error' : message })
}

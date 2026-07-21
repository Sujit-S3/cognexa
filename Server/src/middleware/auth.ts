import jwt from 'jsonwebtoken'
import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'
import { User } from '../models/user.model'
import { asyncHandler } from './asyncHandler'

interface AccessTokenPayload {
  sub?: string
  _id?: string
  type?: string
  iat?: number
}

export function passwordChangedAfterIssue(
  passwordChangedAt: Date | undefined,
  issuedAt: number | undefined
): boolean {
  return Boolean(passwordChangedAt && issuedAt && Math.floor(passwordChangedAt.getTime() / 1000) > issuedAt)
}

async function resolveUser(token: string) {
  const decoded = jwt.verify(token, env.SECRET_KEY) as AccessTokenPayload
  const userId = decoded.sub ?? decoded._id
  if (!userId || (decoded.type && decoded.type !== 'access')) return null

  const user = await User.findOne({ _id: userId, invalidatedTokens: { $ne: token }, isActive: true }).select(
    '+passwordChangedAt'
  )
  const changedAfterIssue = passwordChangedAfterIssue(user?.passwordChangedAt, decoded.iat)
  return !user || changedAfterIssue ? null : user
}

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Please authenticate.' })
    return
  }

  try {
    const user = await resolveUser(token)
    if (!user) {
      res.status(401).json({ error: 'Please authenticate.' })
      return
    }

    req.token = token
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Please authenticate.' })
  }
})

export const optionalAuthenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined
  if (!token) {
    next()
    return
  }

  try {
    const user = await resolveUser(token)
    if (!user) {
      res.status(401).json({ error: 'Please authenticate.' })
      return
    }
    req.token = token
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Please authenticate.' })
  }
})

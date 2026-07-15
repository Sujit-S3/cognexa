import jwt from 'jsonwebtoken'
import { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'
import { User } from '../models/user.model'
import { asyncHandler } from './asyncHandler'

interface AccessTokenPayload {
  _id: string
}

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authorization = req.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Please authenticate.' })
    return
  }

  try {
    const decoded = jwt.verify(token, env.SECRET_KEY) as AccessTokenPayload
    // Single query combining the user lookup + logout-blocklist check (previously two round trips).
    const user = await User.findOne({ _id: decoded._id, invalidatedTokens: { $ne: token } })

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

import crypto from 'crypto'
import type { Request, Response } from 'express'
import { env } from '../config/env'
import { Session } from '../models/session.model'
import { User, type UserDocument } from '../models/user.model'
import { AppError } from '../utils/AppError'

const refreshTtlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex')

function createRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.get('cookie')
  if (!header) return undefined

  for (const segment of header.split(';')) {
    const [rawName, ...rawValue] = segment.trim().split('=')
    if (rawName === name) return decodeURIComponent(rawValue.join('='))
  }
  return undefined
}

export function hasRefreshCookie(req: Request): boolean {
  return Boolean(readCookie(req, env.REFRESH_COOKIE_NAME))
}

function cookieAttributes(maxAgeSeconds: number): string {
  const domain = env.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : ''
  const secure = env.COOKIE_SECURE ? '; Secure' : ''
  // The canonical endpoint is /api/v1/auth while a temporary compatibility
  // alias exists at /auth, so the cookie must cover both paths.
  return `Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${secure}${domain}`
}

function setRefreshCookie(res: Response, token: string): void {
  res.append(
    'Set-Cookie',
    `${env.REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes(Math.floor(refreshTtlMs / 1000))}`
  )
}

export function clearRefreshCookie(res: Response): void {
  res.append('Set-Cookie', `${env.REFRESH_COOKIE_NAME}=; ${cookieAttributes(0)}`)
}

function requestMetadata(req: Request): Pick<SessionAttrs, 'userAgent' | 'ipHash'> {
  return {
    userAgent: req.get('user-agent')?.slice(0, 512),
    // Store only a keyed digest; raw IP addresses are unnecessary session metadata.
    ipHash: crypto
      .createHmac('sha256', env.SECRET_KEY)
      .update(req.ip ?? '')
      .digest('hex'),
  }
}

type SessionAttrs = {
  userAgent?: string
  ipHash?: string
}

export async function issueSession(req: Request, res: Response, user: UserDocument): Promise<string> {
  const refreshToken = createRefreshToken()
  await Session.create({
    user: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshTtlMs),
    lastSeenAt: new Date(),
    ...requestMetadata(req),
  })

  setRefreshCookie(res, refreshToken)
  return user.generateAuthToken()
}

export async function rotateSession(
  req: Request,
  res: Response
): Promise<{ user: UserDocument; token: string }> {
  const currentToken = readCookie(req, env.REFRESH_COOKIE_NAME)
  if (!currentToken) throw new AppError(401, 'Session expired')

  const session = await Session.findOne({
    tokenHash: hashRefreshToken(currentToken),
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash')

  if (!session) {
    clearRefreshCookie(res)
    throw new AppError(401, 'Session expired')
  }

  const user = await User.findById(session.user)
  if (!user || !user.isActive) {
    await session.deleteOne()
    clearRefreshCookie(res)
    throw new AppError(401, 'Session expired')
  }

  const nextRefreshToken = createRefreshToken()
  session.tokenHash = hashRefreshToken(nextRefreshToken)
  session.expiresAt = new Date(Date.now() + refreshTtlMs)
  session.lastSeenAt = new Date()
  Object.assign(session, requestMetadata(req))
  await session.save()

  setRefreshCookie(res, nextRefreshToken)
  return { user, token: await user.generateAuthToken() }
}

export function currentRefreshToken(req: Request): string | undefined {
  return readCookie(req, env.REFRESH_COOKIE_NAME)
}

export async function revokeCurrentSession(req: Request, res: Response): Promise<void> {
  const token = currentRefreshToken(req)
  if (token) await Session.deleteOne({ tokenHash: hashRefreshToken(token) })
  clearRefreshCookie(res)
}

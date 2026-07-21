import crypto from 'crypto'
import { Request, Response } from 'express'
import { User } from '../../models/user.model'
import { Session } from '../../models/session.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { sendPasswordResetEmail, sendWelcomeEmail } from '../../services/email.service'
import { requireParam } from '../../utils/httpParams'
import {
  clearRefreshCookie,
  currentRefreshToken,
  hashRefreshToken,
  hasRefreshCookie,
  issueSession,
  revokeCurrentSession,
  rotateSession,
} from '../../services/session.service'

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

export const sessionStatus = asyncHandler(async (req: Request, res: Response) => {
  res.set('cache-control', 'no-store').json({ hasSession: hasRefreshCookie(req) })
})

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { passwordConfirm: _passwordConfirm, ...body } = req.body
  const user = new User({ ...body, code: Date.now() })
  await user.save()
  const token = await issueSession(req, res, user)

  sendWelcomeEmail(user.email, user.name).catch(() => undefined)

  res.status(201).json({ user, token })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await issueSession(req, res, user)
    res.json({ user, token })
  } catch {
    // Same message for "no such user" and "wrong password" — don't leak which one it was.
    throw new AppError(401, 'Invalid email or password')
  }
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const session = await rotateSession(req, res)
  res.json(session)
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await revokeCurrentSession(req, res)
  res.json({ message: 'Logged out' })
})

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await Session.deleteMany({ user: req.user!._id })
  clearRefreshCookie(res)
  res.json({ message: 'Signed out on all devices' })
})

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const currentToken = currentRefreshToken(req)
  const currentHash = currentToken ? hashRefreshToken(currentToken) : undefined
  const sessions = await Session.find({ user: req.user!._id, expiresAt: { $gt: new Date() } })
    .select('+tokenHash')
    .sort({ lastSeenAt: -1 })

  res.json(
    sessions.map((session) => ({
      id: session._id,
      userAgent: session.userAgent,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      current: Boolean(currentHash && session.tokenHash === currentHash),
    }))
  )
})

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await Session.findOneAndDelete({
    _id: requireParam(req, 'sessionId'),
    user: req.user!._id,
  }).select('+tokenHash')
  if (!session) throw new AppError(404, 'Session not found')

  const currentToken = currentRefreshToken(req)
  if (currentToken && session.tokenHash === hashRefreshToken(currentToken)) clearRefreshCookie(res)
  res.status(204).send()
})

export const recoverPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.body.email })

  // Respond identically whether or not the account exists — avoids user-enumeration.
  if (user) {
    const plainResetToken = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken = hashToken(plainResetToken)
    user.passwordResetValidity = new Date(Date.now() + 15 * 60 * 1000)
    await user.save({ validateBeforeSave: false })
    sendPasswordResetEmail(user.email, plainResetToken).catch(() => undefined)
  }

  res.json({ message: 'If that email exists, a password reset link has been sent.' })
})

export const verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({
    passwordResetToken: hashToken(requireParam(req, 'token')),
    passwordResetValidity: { $gt: new Date() },
  })
  if (!user) throw new AppError(400, 'Password reset token is invalid or has expired')
  res.json({ valid: true })
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({
    passwordResetToken: hashToken(requireParam(req, 'token')),
    passwordResetValidity: { $gt: new Date() },
  })
  if (!user) throw new AppError(400, 'Password reset token is invalid or has expired')

  user.password = req.body.password
  user.passwordResetToken = undefined
  user.passwordResetValidity = undefined
  // The original controller never called save() here — the reset silently did nothing. Fixed.
  await user.save()
  await Session.deleteMany({ user: user._id })

  res.json({ message: 'Your password has been updated.' })
})

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.json(req.user)
})

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  Object.assign(user, req.body)
  await user.save()
  const token = await user.generateAuthToken()
  res.json({ user, token })
})

export const deleteMe = asyncHandler(async (req: Request, res: Response) => {
  // .remove() was deprecated/removed upstream in modern Mongoose — use deleteOne() on the document.
  await Session.deleteMany({ user: req.user!._id })
  await req.user!.deleteOne()
  clearRefreshCookie(res)
  res.json({ message: 'Account deleted' })
})

import { Request, Response } from 'express'
import { User, type UserDocument } from '../../models/user.model'
import { Session } from '../../models/session.model'
import { AuditLog } from '../../models/auditLog.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { recordAuditEvent } from '../../services/auditLog.service'

// user.model.ts's toJSON transform (unlike every other model) does not map _id -> id — build an
// explicit DTO here rather than relying on serialization to do it.
function toAdminUserView(user: UserDocument) {
  return {
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastSeenAt: user.lastSeenAt,
  }
}

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { search, role, page, limit } = req.query as unknown as {
    search?: string
    role?: string
    page: number
    limit: number
  }

  const filter: Record<string, unknown> = {}
  if (role) filter.role = role
  if (search) {
    const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: pattern }, { email: pattern }, { username: pattern }]
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ])

  res.json({ users: users.map(toAdminUserView), total, page, limit })
})

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params
  if (userId === req.user!._id.toString()) {
    throw new AppError(400, 'You cannot change your own account status')
  }

  const user = await User.findById(userId).orFail(() => new AppError(404, 'User not found'))
  const { isActive } = req.body as { isActive: boolean }
  user.isActive = isActive
  await user.save()

  // authenticate()/rotateSession() already re-check isActive on every request, but clearing
  // sessions here immediately revokes any refresh cookie the user is still holding, matching
  // the same defensive cleanup other account-lifecycle actions (resetPassword, deleteMe) do.
  if (!isActive) await Session.deleteMany({ user: user._id })

  await recordAuditEvent({
    actor: req.user!._id,
    action: isActive ? 'user.activate' : 'user.deactivate',
    targetType: 'User',
    targetId: user._id,
  })

  res.json(toAdminUserView(user))
})

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params
  if (userId === req.user!._id.toString()) {
    throw new AppError(400, 'You cannot change your own account role')
  }

  const user = await User.findById(userId).orFail(() => new AppError(404, 'User not found'))
  const { role } = req.body as { role: UserDocument['role'] }
  const previousRole = user.role
  user.role = role
  await user.save()

  await recordAuditEvent({
    actor: req.user!._id,
    action: 'user.role_change',
    targetType: 'User',
    targetId: user._id,
    metadata: { from: previousRole, to: role },
  })

  res.json(toAdminUserView(user))
})

export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const { organization, page, limit } = req.query as unknown as {
    organization?: string
    page: number
    limit: number
  }

  // Platform-only by default — an admin drilling into one tenant must explicitly pass
  // ?organization=<id>, so the undifferentiated view never mixes in another tenant's activity.
  const filter: Record<string, unknown> = organization
    ? { organization }
    : { organization: { $exists: false } }

  const [entries, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate<{ actor: UserDocument }>('actor', 'name email'),
    AuditLog.countDocuments(filter),
  ])

  // actor is populated with a full User document, whose toJSON transform (unlike AuditLog's)
  // does not map _id -> id — rebuild it explicitly so the response is consistent.
  const view = entries.map((entry) => ({
    ...entry.toJSON(),
    actor: { id: entry.actor._id.toString(), name: entry.actor.name, email: entry.actor.email },
  }))

  res.json({ entries: view, total, page, limit })
})

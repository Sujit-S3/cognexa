import crypto from 'crypto'
import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { Organization, type OrganizationDocument } from '../../models/organization.model'
import { Invitation, type InvitationAttrs, type InvitationDocument } from '../../models/invitation.model'
import { Achievement } from '../../models/achievement.model'
import { AuditLog } from '../../models/auditLog.model'
import { Course } from '../../models/course.model'
import { User, type UserDocument } from '../../models/user.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { assertOrgRole, assertOrgRoleHierarchy, getMembership } from '../../utils/organizationAccess'
import { getEnrollment } from '../../utils/courseAccess'
import { recordAuditEvent } from '../../services/auditLog.service'
import { sendEmail } from '../../services/email.service'
import { env } from '../../config/env'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 80) || 'org'
  )
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let slug = base
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (!(await Organization.exists({ slug }))) return slug
    slug = `${base}-${crypto.randomBytes(3).toString('hex')}`
  }
  return `${base}-${crypto.randomBytes(4).toString('hex')}`
}

// user.model.ts's toJSON transform does not map _id -> id — build an explicit DTO rather than
// relying on serialization, matching admin.controller.ts's toAdminUserView.
function toMemberUserView(user: UserDocument) {
  return { id: user._id.toString(), name: user.name, email: user.email, photo: user.photo }
}

async function serializeOrganization(org: OrganizationDocument) {
  const memberIds = org.members.map((member) => member.user)
  const users = await User.find({ _id: { $in: memberIds } })
  const usersById = new Map(users.map((user) => [user._id.toString(), user]))

  return {
    ...org.toJSON(),
    members: org.members.map((member) => {
      const user = usersById.get(member.user.toString())
      return {
        id: member._id.toString(),
        role: member.role,
        joinedAt: member.joinedAt,
        user: user ? toMemberUserView(user) : null,
      }
    }),
  }
}

// A lapsed invitation stays stored as 'pending' until something touches it (accept/revoke) —
// compute the effective status at read time instead of a TTL/cron sweep, per invitation.model.ts.
function effectiveInvitationStatus(invitation: Pick<InvitationAttrs, 'status' | 'expiresAt'>) {
  if (invitation.status === 'pending' && invitation.expiresAt.getTime() < Date.now())
    return 'expired' as const
  return invitation.status
}

function serializeInvitation(invitation: InvitationDocument) {
  const value = invitation.toJSON() as Record<string, unknown>
  return { ...value, status: effectiveInvitationStatus(invitation) }
}

async function requireOrg(orgId: string): Promise<OrganizationDocument> {
  return Organization.findById(orgId).orFail(() => new AppError(404, 'Organization not found'))
}

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body as { name: string }
  const slug = await generateUniqueSlug(name)
  const creator = req.user!

  const org = await Organization.create({
    name,
    slug,
    createdBy: creator._id,
    members: [{ user: creator._id, role: 'owner', joinedAt: new Date() }],
  })

  creator.organizations.push(org._id)
  await creator.save()

  await recordAuditEvent({
    actor: creator._id,
    action: 'organization.create',
    targetType: 'Organization',
    targetId: org._id,
    organization: org._id,
  })

  res.status(201).json(await serializeOrganization(org))
})

export const listMyOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const orgs = await Organization.find({ 'members.user': req.user!._id }).sort({ createdAt: -1 })
  res.json(await Promise.all(orgs.map(serializeOrganization)))
})

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin', 'member'])
  res.json(await serializeOrganization(org))
})

export const inviteMember = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const { email, role } = req.body as { email: string; role: 'owner' | 'admin' | 'member' }
  // Without this, an 'admin' member (allowed to invite at all) could invite a brand-new user
  // directly as 'owner', a de facto self-serve path to organization takeover.
  assertOrgRoleHierarchy(org, req.user!._id, req.user!.role, { grantedRole: role })

  const existingUser = await User.findOne({ email })
  if (existingUser && getMembership(org, existingUser._id)) {
    throw new AppError(409, 'This person is already a member of the organization')
  }

  const plainToken = crypto.randomBytes(32).toString('hex')
  const invitation = await Invitation.create({
    organization: org._id,
    email,
    role,
    token: hashToken(plainToken),
    status: 'pending',
    invitedBy: req.user!._id,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  })

  const inviteUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/invitations/${encodeURIComponent(plainToken)}`
  sendEmail({
    to: email,
    subject: `You're invited to join ${org.name} on Cognexa`,
    html: `<p>You've been invited to join <strong>${org.name}</strong> on Cognexa.</p><p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
  }).catch(() => undefined)

  await recordAuditEvent({
    actor: req.user!._id,
    action: 'organization.invite',
    targetType: 'Invitation',
    targetId: invitation._id,
    organization: org._id,
    metadata: { email, role },
  })

  res.status(201).json(serializeInvitation(invitation))
})

export const listInvitations = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const invitations = await Invitation.find({ organization: org._id }).sort({ createdAt: -1 })
  res.json(invitations.map(serializeInvitation))
})

export const revokeInvitation = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const invitation = await Invitation.findOne({
    _id: req.params.invitationId,
    organization: org._id,
  }).orFail(() => new AppError(404, 'Invitation not found'))

  if (invitation.status !== 'pending') {
    throw new AppError(409, 'Only a pending invitation can be revoked')
  }
  invitation.status = 'revoked'
  await invitation.save()

  await recordAuditEvent({
    actor: req.user!._id,
    action: 'organization.invite_revoke',
    targetType: 'Invitation',
    targetId: invitation._id,
    organization: org._id,
  })

  res.json(serializeInvitation(invitation))
})

export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const { userId } = req.params
  const { role } = req.body as { role: 'owner' | 'admin' | 'member' }
  const membership = getMembership(org, userId!)
  if (!membership) throw new AppError(404, 'This user is not a member of the organization')

  // Without this, an 'admin' member could grant themselves (or anyone) 'owner', or demote a
  // current 'owner' to 'member' — both closing off with assertOrgRole alone since 'owner' and
  // 'admin' are equally privileged for *reaching* this endpoint.
  assertOrgRoleHierarchy(org, req.user!._id, req.user!.role, {
    grantedRole: role,
    targetCurrentRole: membership.role,
  })

  const previousRole = membership.role
  membership.role = role
  await org.save()

  await recordAuditEvent({
    actor: req.user!._id,
    action: 'organization.member_role_change',
    targetType: 'User',
    targetId: membership.user,
    organization: org._id,
    metadata: { from: previousRole, to: role },
  })

  res.json(await serializeOrganization(org))
})

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const { userId } = req.params
  const membership = getMembership(org, userId!)
  if (!membership) throw new AppError(404, 'This user is not a member of the organization')

  // Without this, an 'admin' member could remove the 'owner' outright.
  assertOrgRoleHierarchy(org, req.user!._id, req.user!.role, { targetCurrentRole: membership.role })

  org.members = org.members.filter((member) => member.user.toString() !== userId) as typeof org.members
  await org.save()
  await User.updateOne({ _id: userId }, { $pull: { organizations: org._id } })

  await recordAuditEvent({
    actor: req.user!._id,
    action: 'organization.member_remove',
    targetType: 'User',
    targetId: new Types.ObjectId(userId),
    organization: org._id,
  })

  res.status(204).end()
})

export const assignLearning = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const { userId, courseId } = req.body as { userId: string; courseId: string }
  if (!getMembership(org, userId)) throw new AppError(404, 'This user is not a member of the organization')

  const targetUser = await User.findById(userId).orFail(() => new AppError(404, 'User not found'))
  const course = await Course.findById(courseId).orFail(() => new AppError(404, 'Course not found'))
  if (course.status !== 'published') throw new AppError(409, 'Only published courses can be assigned')

  // Atomic conditional update — see courses.controller.ts#enroll for why enroll()+save() is
  // unsafe against concurrent requests (e.g. a double-clicked "Assign" button).
  const privilege = course.resolveEnrollmentPrivilege(targetUser._id, targetUser.role)
  const updated = await Course.enrollAtomic(course._id, targetUser._id, privilege)
  if (!updated) throw new AppError(409, 'Member is already enrolled in this course')

  targetUser.enrollments.push(course._id)
  await targetUser.save()

  await recordAuditEvent({
    actor: req.user!._id,
    action: 'organization.assign_learning',
    targetType: 'Course',
    targetId: course._id,
    organization: org._id,
    metadata: { userId },
  })

  res.status(201).json({ userId, courseId: course._id.toString() })
})

export const getMembersProgress = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const memberIds = org.members.map((member) => member.user)
  const [members, courses, achievementCounts] = await Promise.all([
    User.find({ _id: { $in: memberIds } }),
    Course.find({ 'enrollments.user': { $in: memberIds } }),
    Achievement.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { user: { $in: memberIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
  ])
  const achievementsByUser = new Map(achievementCounts.map((entry) => [entry._id.toString(), entry.count]))

  const progress = members.map((member) => {
    const memberCourses = courses.filter((course) => getEnrollment(course, member._id))
    return {
      userId: member._id.toString(),
      name: member.name,
      email: member.email,
      certificatesEarned: achievementsByUser.get(member._id.toString()) ?? 0,
      courses: memberCourses.map((course) => ({
        courseId: course._id.toString(),
        courseName: course.name,
        progress: course.computeProgress(member._id),
      })),
    }
  })

  res.json(progress)
})

export const getOrganizationAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const org = await requireOrg(req.params.orgId!)
  assertOrgRole(org, req.user!._id, req.user!.role, ['owner', 'admin'])

  const entries = await AuditLog.find({ organization: org._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate<{ actor: UserDocument | null }>('actor', 'name email')

  // populate() resolves to null (not a throw) if the actor's account was since self-deleted —
  // see admin.controller.ts#getAuditLog for the same guard and rationale.
  res.json(
    entries.map((entry) => ({
      ...entry.toJSON(),
      actor: entry.actor
        ? { id: entry.actor._id.toString(), name: entry.actor.name, email: entry.actor.email }
        : { id: null, name: 'Deleted user', email: '' },
    }))
  )
})

export const getInvitationByToken = asyncHandler(async (req: Request, res: Response) => {
  const invitation = await Invitation.findOne({ token: hashToken(req.params.token!) })
    .select('+token')
    .populate<{ organization: OrganizationDocument }>('organization', 'name')
    .orFail(() => new AppError(404, 'Invitation not found'))

  res.json({
    id: invitation._id.toString(),
    organization: { id: invitation.organization._id.toString(), name: invitation.organization.name },
    email: invitation.email,
    role: invitation.role,
    status: effectiveInvitationStatus(invitation),
  })
})

export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const invitation = await Invitation.findOne({ token: hashToken(req.params.token!) }).orFail(
    () => new AppError(404, 'Invitation not found')
  )

  if (invitation.email !== req.user!.email) {
    throw new AppError(403, 'This invitation was sent to a different email address')
  }
  if (effectiveInvitationStatus(invitation) !== 'pending') {
    throw new AppError(409, 'This invitation is no longer valid')
  }

  const org = await Organization.findById(invitation.organization).orFail(
    () => new AppError(404, 'Organization not found')
  )

  if (!getMembership(org, req.user!._id)) {
    org.members.push({ user: req.user!._id, role: invitation.role, joinedAt: new Date() })
    await org.save()
    req.user!.organizations.push(org._id)
    await req.user!.save()
  }

  invitation.status = 'accepted'
  await invitation.save()

  await recordAuditEvent({
    actor: req.user!._id,
    action: 'organization.invite_accept',
    targetType: 'Organization',
    targetId: org._id,
    organization: org._id,
  })

  res.json(await serializeOrganization(org))
})

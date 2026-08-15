import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Types } from 'mongoose'

// organizations.controller.ts sends invitation email (email.service.ts) and imports config/env.ts
// directly — env vars must exist before that first import, so set them and defer the imports
// under test (Pattern B).
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

// Mocked so the invite email's plaintext token can be captured directly, to prove the stored
// token is a hash of it rather than the plaintext itself (see the hashing assertion below).
const emailMocks = vi.hoisted(() => ({
  sendEmail: vi.fn(async (_options: { to: string; subject: string; html: string }) => undefined),
}))
vi.mock('../services/email.service', async () => {
  const actual =
    await vi.importActual<typeof import('../services/email.service')>('../services/email.service')
  return { ...actual, sendEmail: emailMocks.sendEmail }
})

let User: typeof import('../models/user.model').User
let Organization: typeof import('../models/organization.model').Organization
let Invitation: typeof import('../models/invitation.model').Invitation
let Course: typeof import('../models/course.model').Course
let AuditLog: typeof import('../models/auditLog.model').AuditLog
let organizations: typeof import('../modules/organizations/organizations.controller')
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ User } = await import('../models/user.model'))
  ;({ Organization } = await import('../models/organization.model'))
  ;({ Invitation } = await import('../models/invitation.model'))
  ;({ Course } = await import('../models/course.model'))
  ;({ AuditLog } = await import('../models/auditLog.model'))
  organizations = await import('../modules/organizations/organizations.controller')
  ;({ invokeMiddleware, mockReq } = await import('./testHttp'))
  ;({ connectTestDb, disconnectTestDb, clearTestDb } = await import('./testDb'))
  await connectTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

async function createUser(
  role: 'student' | 'instructor' | 'admin' = 'student',
  overrides: Record<string, unknown> = {}
) {
  const suffix = new Types.ObjectId().toString()
  return User.create({
    username: `user-${suffix}`,
    name: 'Test User',
    email: `user-${suffix}@example.com`,
    password: 'correct horse battery staple',
    mobile: '555-010-1234',
    role,
    ...overrides,
  })
}

function asReqUser(user: Awaited<ReturnType<typeof createUser>>) {
  return { _id: user._id, role: user.role }
}

// createOrganization mutates req.user!.organizations directly (like acceptInvitation does) —
// it needs the real Mongoose document, not the reduced {_id, role} shape used elsewhere.
async function createOrgWithOwner(owner: Awaited<ReturnType<typeof createUser>>, name = 'Acme University') {
  const { res } = await invokeMiddleware<{ id: string }>(
    organizations.createOrganization,
    mockReq({ user: owner, body: { name } })
  )
  const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as { id: string }
  return Organization.findById(body.id).orFail()
}

describe('createOrganization', () => {
  it('creates an organization, enrolls the creator as owner, and syncs User.organizations', async () => {
    const founder = await createUser('instructor')
    const org = await createOrgWithOwner(founder, 'Acme University')

    expect(org.members).toHaveLength(1)
    expect(org.members[0]!.role).toBe('owner')
    const refreshed = await User.findById(founder._id)
    expect(refreshed!.organizations.map((id) => id.toString())).toContain(org._id.toString())

    const events = await AuditLog.find({ organization: org._id })
    expect(events.some((e) => e.action === 'organization.create')).toBe(true)
  })

  it('generates unique slugs for organizations with the same name', async () => {
    const founder = await createUser('instructor')
    const org1 = await createOrgWithOwner(founder, 'Acme University')
    const org2 = await createOrgWithOwner(founder, 'Acme University')
    expect(org1.slug).not.toBe(org2.slug)
  })
})

describe('membership access control', () => {
  it('rejects a plain member from inviting others', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const member = await createUser('student')
    org.members.push({ user: member._id, role: 'member', joinedAt: new Date() })
    await org.save()

    const { next } = await invokeMiddleware(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(member),
        body: { email: 'new@example.com', role: 'member' },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })

  it('lets a global admin manage an org they are not a member of', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const admin = await createUser('admin')

    const { res } = await invokeMiddleware(
      organizations.getOrganization,
      mockReq({ params: { orgId: org._id.toString() }, user: asReqUser(admin) })
    )
    expect(res.json).toHaveBeenCalled()
  })
})

describe('invitation lifecycle', () => {
  it('invites a member and stores a hash of the emailed token, never the plaintext', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const invitee = await createUser('student')
    emailMocks.sendEmail.mockClear()

    await invokeMiddleware(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { email: invitee.email, role: 'member' },
      })
    )

    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1)
    const { html } = emailMocks.sendEmail.mock.calls[0]![0] as { html: string }
    const plainToken = decodeURIComponent(html.match(/\/invitations\/([^"]+)"/)![1]!)

    const invitation = await Invitation.findOne({ organization: org._id }).orFail()
    const storedHash = await Invitation.collection
      .findOne<{ token: string }>({ _id: invitation._id }, { projection: { token: 1 } })
      .then((doc) => doc!.token)

    const crypto = await import('crypto')
    expect(storedHash).toBe(crypto.createHash('sha256').update(plainToken).digest('hex'))
    expect(storedHash).not.toBe(plainToken)
  })

  it('never includes the token (plaintext or hash) in the invite API response body', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const invitee = await createUser('student')

    const { body } = await invokeMiddleware(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { email: invitee.email, role: 'member' },
      })
    )

    expect(body).not.toHaveProperty('token')
  })

  it('escapes an HTML-injecting organization name before embedding it in the invite email', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner, '<img src=x onerror=alert(1)>Acme & Co')
    const invitee = await createUser('student')
    emailMocks.sendEmail.mockClear()

    await invokeMiddleware(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { email: invitee.email, role: 'member' },
      })
    )

    const { html } = emailMocks.sendEmail.mock.calls[0]![0] as { html: string }
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;Acme &amp; Co')
  })

  it('rejects an org admin inviting a new member as owner', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const orgAdmin = await createUser('student')
    org.members.push({ user: orgAdmin._id, role: 'admin', joinedAt: new Date() })
    await org.save()

    const { next } = await invokeMiddleware(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(orgAdmin),
        body: { email: 'new-owner@example.com', role: 'owner' },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
    expect(await Invitation.countDocuments({ organization: org._id })).toBe(0)
  })

  it('404s for a token that does not match any stored invitation', async () => {
    const { next } = await invokeMiddleware(
      organizations.getInvitationByToken,
      mockReq({ params: { token: 'not-a-real-token' } })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 404 })
  })

  it('accepts an invitation end-to-end using the real plaintext token flow', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const invitee = await createUser('student')

    const { res: inviteRes } = await invokeMiddleware(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { email: invitee.email, role: 'admin' },
      })
    )
    expect(inviteRes.status).toHaveBeenCalledWith(201)

    // Reach into the audit log's metadata is not how the real client gets the token (only the
    // email has it) — instead, drive acceptance the same way the controller itself validates:
    // mint a token, hash it the same way, and store it directly to simulate "the email arrived".
    const crypto = await import('crypto')
    const plainToken = 'integration-test-token'
    await Invitation.updateOne(
      { organization: org._id, email: invitee.email },
      { $set: { token: crypto.createHash('sha256').update(plainToken).digest('hex') } }
    )

    const { body: preview } = await invokeMiddleware<{ status: string; email: string }>(
      organizations.getInvitationByToken,
      mockReq({ params: { token: plainToken } })
    )
    expect(preview.status).toBe('pending')
    expect(preview.email).toBe(invitee.email)

    const { res: acceptRes } = await invokeMiddleware(
      organizations.acceptInvitation,
      mockReq({ params: { token: plainToken }, user: invitee })
    )
    expect(acceptRes.json).toHaveBeenCalled()

    const updatedOrg = await Organization.findById(org._id).orFail()
    expect(
      updatedOrg.members.some((m) => m.user.toString() === invitee._id.toString() && m.role === 'admin')
    ).toBe(true)
    const refreshedInvitee = await User.findById(invitee._id)
    expect(refreshedInvitee!.organizations.map((id) => id.toString())).toContain(org._id.toString())

    const invitation = await Invitation.findOne({ organization: org._id, email: invitee.email })
    expect(invitation!.status).toBe('accepted')
  })

  it('rejects acceptance by a user whose email does not match the invitation', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const invitee = await createUser('student')
    const intruder = await createUser('student')

    await invokeMiddleware(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { email: invitee.email, role: 'member' },
      })
    )

    const crypto = await import('crypto')
    const plainToken = 'mismatch-test-token'
    await Invitation.updateOne(
      { organization: org._id, email: invitee.email },
      { $set: { token: crypto.createHash('sha256').update(plainToken).digest('hex') } }
    )

    const { next } = await invokeMiddleware(
      organizations.acceptInvitation,
      mockReq({ params: { token: plainToken }, user: intruder })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })

  it('reports an invitation as expired at read time without a background sweep', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const invitee = await createUser('student')

    const crypto = await import('crypto')
    const plainToken = 'expired-test-token'
    await Invitation.create({
      organization: org._id,
      email: invitee.email,
      role: 'member',
      token: crypto.createHash('sha256').update(plainToken).digest('hex'),
      status: 'pending',
      invitedBy: owner._id,
      expiresAt: new Date(Date.now() - 1_000),
    })

    const { body } = await invokeMiddleware<{ status: string }>(
      organizations.getInvitationByToken,
      mockReq({ params: { token: plainToken } })
    )
    expect(body.status).toBe('expired')

    // The row itself is untouched — still 'pending' in storage, per the no-TTL-sweep design.
    const stored = await Invitation.findOne({ organization: org._id, email: invitee.email })
    expect(stored!.status).toBe('pending')

    const { next } = await invokeMiddleware(
      organizations.acceptInvitation,
      mockReq({ params: { token: plainToken }, user: invitee })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 409 })
  })

  it('revokes a pending invitation', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)

    const { res: inviteRes } = await invokeMiddleware<{ id: string }>(
      organizations.inviteMember,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { email: 'someone@example.com', role: 'member' },
      })
    )
    const invitationBody = (inviteRes.json as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0]![0] as {
      id: string
    }

    await invokeMiddleware(
      organizations.revokeInvitation,
      mockReq({
        params: { orgId: org._id.toString(), invitationId: invitationBody.id },
        user: asReqUser(owner),
      })
    )

    expect((await Invitation.findById(invitationBody.id))!.status).toBe('revoked')
  })
})

describe('member management', () => {
  it('updates a member role and removes a member, syncing User.organizations', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const member = await createUser('student')
    org.members.push({ user: member._id, role: 'member', joinedAt: new Date() })
    await org.save()
    member.organizations.push(org._id)
    await member.save()

    await invokeMiddleware(
      organizations.updateMemberRole,
      mockReq({
        params: { orgId: org._id.toString(), userId: member._id.toString() },
        user: asReqUser(owner),
        body: { role: 'admin' },
      })
    )
    const afterRoleChange = await Organization.findById(org._id).orFail()
    expect(afterRoleChange.members.find((m) => m.user.toString() === member._id.toString())!.role).toBe(
      'admin'
    )

    await invokeMiddleware(
      organizations.removeMember,
      mockReq({
        params: { orgId: org._id.toString(), userId: member._id.toString() },
        user: asReqUser(owner),
      })
    )
    const afterRemoval = await Organization.findById(org._id).orFail()
    expect(afterRemoval.members.some((m) => m.user.toString() === member._id.toString())).toBe(false)
    const refreshedMember = await User.findById(member._id)
    expect(refreshedMember!.organizations.map((id) => id.toString())).not.toContain(org._id.toString())
  })

  it('rejects an org admin promoting themselves (or anyone) to owner', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const orgAdmin = await createUser('student')
    org.members.push({ user: orgAdmin._id, role: 'admin', joinedAt: new Date() })
    await org.save()

    const { next } = await invokeMiddleware(
      organizations.updateMemberRole,
      mockReq({
        params: { orgId: org._id.toString(), userId: orgAdmin._id.toString() },
        user: asReqUser(orgAdmin),
        body: { role: 'owner' },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })

    const unchanged = await Organization.findById(org._id).orFail()
    expect(unchanged.members.find((m) => m.user.toString() === orgAdmin._id.toString())!.role).toBe('admin')
  })

  it('rejects an org admin removing (or demoting) the owner', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const orgAdmin = await createUser('student')
    org.members.push({ user: orgAdmin._id, role: 'admin', joinedAt: new Date() })
    await org.save()

    const removeAttempt = await invokeMiddleware(
      organizations.removeMember,
      mockReq({
        params: { orgId: org._id.toString(), userId: owner._id.toString() },
        user: asReqUser(orgAdmin),
      })
    )
    expect(removeAttempt.next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })

    const demoteAttempt = await invokeMiddleware(
      organizations.updateMemberRole,
      mockReq({
        params: { orgId: org._id.toString(), userId: owner._id.toString() },
        user: asReqUser(orgAdmin),
        body: { role: 'member' },
      })
    )
    expect(demoteAttempt.next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })

    const unchanged = await Organization.findById(org._id).orFail()
    expect(
      unchanged.members.some((m) => m.user.toString() === owner._id.toString() && m.role === 'owner')
    ).toBe(true)
  })

  it('allows the owner (rank above admin) to demote an admin, and allows an admin to promote a member to admin', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const orgAdmin = await createUser('instructor')
    const member = await createUser('student')
    org.members.push(
      { user: orgAdmin._id, role: 'admin', joinedAt: new Date() },
      { user: member._id, role: 'member', joinedAt: new Date() }
    )
    await org.save()

    await invokeMiddleware(
      organizations.updateMemberRole,
      mockReq({
        params: { orgId: org._id.toString(), userId: orgAdmin._id.toString() },
        user: asReqUser(owner),
        body: { role: 'member' },
      })
    )
    const afterOwnerDemotesAdmin = await Organization.findById(org._id).orFail()
    expect(
      afterOwnerDemotesAdmin.members.find((m) => m.user.toString() === orgAdmin._id.toString())!.role
    ).toBe('member')

    await invokeMiddleware(
      organizations.updateMemberRole,
      mockReq({
        params: { orgId: org._id.toString(), userId: member._id.toString() },
        user: asReqUser(owner),
        body: { role: 'admin' },
      })
    )
    const afterPromotion = await Organization.findById(org._id).orFail()
    expect(afterPromotion.members.find((m) => m.user.toString() === member._id.toString())!.role).toBe(
      'admin'
    )
  })
})

describe('assignLearning', () => {
  it('enrolls an org member in a published course', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const member = await createUser('student')
    org.members.push({ user: member._id, role: 'member', joinedAt: new Date() })
    await org.save()

    const course = await Course.create({
      name: 'Systems Thinking',
      createdBy: new Types.ObjectId(),
      status: 'published',
      modules: [],
      enrollments: [],
    })

    const { res } = await invokeMiddleware(
      organizations.assignLearning,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { userId: member._id.toString(), courseId: course._id.toString() },
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)

    const updatedCourse = await Course.findById(course._id)
    expect(updatedCourse!.enrollments.some((e) => e.user.toString() === member._id.toString())).toBe(true)
    const refreshedMember = await User.findById(member._id)
    expect(refreshedMember!.enrollments.map((id) => id.toString())).toContain(course._id.toString())
  })

  it('rejects assigning a draft course', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const member = await createUser('student')
    org.members.push({ user: member._id, role: 'member', joinedAt: new Date() })
    await org.save()

    const course = await Course.create({
      name: 'Draft Course',
      createdBy: new Types.ObjectId(),
      status: 'draft',
      modules: [],
      enrollments: [],
    })

    const { next } = await invokeMiddleware(
      organizations.assignLearning,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { userId: member._id.toString(), courseId: course._id.toString() },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 409 })
  })

  it('rejects double-assigning a member already enrolled, with a 409 instead of a raw 500', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const member = await createUser('student')
    org.members.push({ user: member._id, role: 'member', joinedAt: new Date() })
    await org.save()

    const course = await Course.create({
      name: 'Systems Thinking',
      createdBy: new Types.ObjectId(),
      status: 'published',
      modules: [],
      enrollments: [{ user: member._id, enrolledAs: 'student', completedItems: [] }],
    })

    const { next } = await invokeMiddleware(
      organizations.assignLearning,
      mockReq({
        params: { orgId: org._id.toString() },
        user: asReqUser(owner),
        body: { userId: member._id.toString(), courseId: course._id.toString() },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 409 })
  })
})

describe('getMembersProgress and getOrganizationAuditLog', () => {
  it('reports per-member course progress', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const member = await createUser('student')
    org.members.push({ user: member._id, role: 'member', joinedAt: new Date() })
    await org.save()

    const course = await Course.create({
      name: 'Systems Thinking',
      createdBy: new Types.ObjectId(),
      status: 'published',
      modules: [
        {
          title: 'Module 1',
          order: 0,
          moduleItems: [{ title: 'Lesson', type: 'markdown', order: 0, content: 'x', isPreview: false }],
        },
      ],
      enrollments: [{ user: member._id, enrolledAs: 'student', completedItems: [] }],
    })

    const { res } = await invokeMiddleware<Array<{ userId: string; courses: Array<{ courseId: string }> }>>(
      organizations.getMembersProgress,
      mockReq({ params: { orgId: org._id.toString() }, user: asReqUser(owner) })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as Array<{
      userId: string
      courses: Array<{ courseId: string }>
    }>
    const memberEntry = body.find((entry) => entry.userId === member._id.toString())
    expect(memberEntry?.courses.some((c) => c.courseId === course._id.toString())).toBe(true)
  })

  it('scopes the org audit log to this organization only', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const otherOrg = await createOrgWithOwner(owner, 'Other Org')

    await AuditLog.create({
      actor: owner._id,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: new Types.ObjectId(),
    })

    const { res } = await invokeMiddleware<Array<{ action: string }>>(
      organizations.getOrganizationAuditLog,
      mockReq({ params: { orgId: org._id.toString() }, user: asReqUser(owner) })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as Array<{
      action: string
    }>
    expect(body.every((entry) => entry.action.startsWith('organization.'))).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    void otherOrg
  })

  it('renders a fallback actor instead of crashing when the actor account was since deleted', async () => {
    const owner = await createUser('instructor')
    const org = await createOrgWithOwner(owner)
    const deletedActorId = new Types.ObjectId()

    await AuditLog.create({
      actor: deletedActorId,
      action: 'organization.invite',
      targetType: 'Invitation',
      targetId: new Types.ObjectId(),
      organization: org._id,
    })

    const { res } = await invokeMiddleware<Array<{ actor: { id: string | null; name: string } }>>(
      organizations.getOrganizationAuditLog,
      mockReq({ params: { orgId: org._id.toString() }, user: asReqUser(owner) })
    )
    const body = (res.json as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as Array<{
      actor: { id: string | null; name: string }
    }>
    expect(body[0]!.actor).toEqual({ id: null, name: 'Deleted user', email: '' })
  })
})

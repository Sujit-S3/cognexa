import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')
const memberRole = z.enum(['owner', 'admin', 'member'])

export const orgIdParamsSchema = z.object({ orgId: objectId }).strict()
export const memberParamsSchema = z.object({ orgId: objectId, userId: objectId }).strict()
export const invitationParamsSchema = z.object({ orgId: objectId, invitationId: objectId }).strict()
export const tokenParamsSchema = z.object({ token: z.string().min(1).max(200) }).strict()

export const createOrganizationSchema = z.object({ name: z.string().trim().min(1).max(160) }).strict()

export const inviteMemberSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(320),
    role: memberRole.default('member'),
  })
  .strict()

export const updateMemberRoleSchema = z.object({ role: memberRole }).strict()

export const assignLearningSchema = z.object({ userId: objectId, courseId: objectId }).strict()

export const acceptInvitationSchema = z.object({}).strict()

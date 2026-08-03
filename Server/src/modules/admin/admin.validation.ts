import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')

export const userIdParamsSchema = z.object({ userId: objectId }).strict()

export const listUsersQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    role: z.enum(['admin', 'instructor', 'student']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export const updateUserStatusSchema = z.object({ isActive: z.boolean() }).strict()

export const updateUserRoleSchema = z.object({ role: z.enum(['admin', 'instructor', 'student']) }).strict()

export const auditLogQuerySchema = z
  .object({
    organization: objectId.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict()

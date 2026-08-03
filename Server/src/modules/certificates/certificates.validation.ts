import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')

export const achievementParamsSchema = z.object({ achievementId: objectId }).strict()
export const verifyCodeParamsSchema = z.object({ code: z.string().trim().min(1).max(64) }).strict()

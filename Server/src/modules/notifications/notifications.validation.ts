import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')

export const notificationParamsSchema = z.object({ notificationId: objectId }).strict()

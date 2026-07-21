import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1).max(12_000),
})

export const tutorCompletionSchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(40),
    context: z.string().max(20_000).optional(),
    maxTokens: z.number().int().min(64).max(2_048).optional(),
    temperature: z.number().min(0).max(1).optional(),
  })
  .strict()

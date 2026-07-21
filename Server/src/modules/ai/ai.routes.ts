import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { aiRateLimiter } from '../../middleware/security'
import { validate } from '../../middleware/validate'
import { completeTutor } from './ai.controller'
import { tutorCompletionSchema } from './ai.validation'

export const aiRouter = Router()

aiRouter.post(
  '/complete',
  authenticate,
  aiRateLimiter,
  validate({ body: tutorCompletionSchema }),
  completeTutor
)

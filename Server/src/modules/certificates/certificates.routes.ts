import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import * as certificates from './certificates.controller'
import { achievementParamsSchema, verifyCodeParamsSchema } from './certificates.validation'

export const certificateRouter = Router()

certificateRouter.get('/mine', authenticate, certificates.getMyAchievements)
certificateRouter.get(
  '/:achievementId/pdf',
  authenticate,
  validate({ params: achievementParamsSchema }),
  certificates.downloadCertificatePdf
)
// Public — see certificates.controller.ts#verifyCertificate for why this route has no auth.
certificateRouter.get(
  '/verify/:code',
  validate({ params: verifyCodeParamsSchema }),
  certificates.verifyCertificate
)

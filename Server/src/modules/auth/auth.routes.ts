import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { authRateLimiter } from '../../middleware/security'
import { validate } from '../../middleware/validate'
import * as authController from './auth.controller'
import {
  loginSchema,
  recoverSchema,
  registerSchema,
  resetPasswordSchema,
  updateUserSchema
} from './auth.validation'

export const authRouter = Router()

authRouter.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register)
authRouter.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login)
authRouter.post('/logout', authenticate, authController.logout)
authRouter.post(
  '/recover',
  authRateLimiter,
  validate({ body: recoverSchema }),
  authController.recoverPassword
)
authRouter.get('/reset/:token', authController.verifyResetToken)
authRouter.post(
  '/reset/:token',
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
)
authRouter.get('/me', authenticate, authController.getMe)
authRouter.patch('/me', authenticate, validate({ body: updateUserSchema }), authController.updateMe)
authRouter.delete('/me', authenticate, authController.deleteMe)

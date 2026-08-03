import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import { validate } from '../../middleware/validate'
import * as admin from './admin.controller'
import {
  auditLogQuerySchema,
  listUsersQuerySchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} from './admin.validation'

export const adminRouter = Router()

adminRouter.use(authenticate, requireRole('admin'))

adminRouter.get('/users', validate({ query: listUsersQuerySchema }), admin.listUsers)
adminRouter.post(
  '/users/:userId/status',
  validate({ params: userIdParamsSchema, body: updateUserStatusSchema }),
  admin.updateUserStatus
)
adminRouter.post(
  '/users/:userId/role',
  validate({ params: userIdParamsSchema, body: updateUserRoleSchema }),
  admin.updateUserRole
)
adminRouter.get('/audit-log', validate({ query: auditLogQuerySchema }), admin.getAuditLog)

import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import { validate } from '../../middleware/validate'
import * as instructor from './instructor.controller'
import {
  courseStatusTransitionSchema,
  courseWorkspaceSchema,
  createCourseDraftSchema,
  uploadSignatureSchema,
} from './instructor.validation'

export const instructorRouter = Router()
export const uploadRouter = Router()

instructorRouter.use(authenticate, requireRole('instructor', 'admin'))

instructorRouter.get('/dashboard', instructor.getDashboard)
instructorRouter.post('/courses', validate({ body: createCourseDraftSchema }), instructor.createDraft)
instructorRouter.get('/courses/:courseId', instructor.getWorkspace)
instructorRouter.put(
  '/courses/:courseId',
  validate({ body: courseWorkspaceSchema }),
  instructor.saveWorkspace
)
instructorRouter.post(
  '/courses/:courseId/status',
  validate({ body: courseStatusTransitionSchema }),
  instructor.transitionStatus
)

uploadRouter.post(
  '/cloudinary/signature',
  authenticate,
  requireRole('instructor', 'admin'),
  validate({ body: uploadSignatureSchema }),
  instructor.createUploadSignature
)

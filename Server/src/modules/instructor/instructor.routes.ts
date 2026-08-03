import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import { validate } from '../../middleware/validate'
import { gradeSubmissionSchema } from '../assessments/assessments.validation'
import * as instructor from './instructor.controller'
import {
  courseStatusTransitionSchema,
  courseWorkspaceSchema,
  createCourseDraftSchema,
  uploadSignatureSchema,
} from './instructor.validation'

export const instructorRouter = Router()
export const uploadRouter = Router()

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')
const gradeParamsSchema = z.object({ courseId: objectId, submissionId: objectId }).strict()

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
instructorRouter.get('/courses/:courseId/submissions', instructor.getSubmissionsQueue)
instructorRouter.post(
  '/courses/:courseId/submissions/:submissionId/grade',
  validate({ params: gradeParamsSchema, body: gradeSubmissionSchema }),
  instructor.gradeSubmission
)

// Authorization is per-purpose inside the controller (course ownership for instructor-authoring
// purposes, enrollment for a learner's own assignment submission) — see createUploadSignature.
uploadRouter.post(
  '/cloudinary/signature',
  authenticate,
  validate({ body: uploadSignatureSchema }),
  instructor.createUploadSignature
)

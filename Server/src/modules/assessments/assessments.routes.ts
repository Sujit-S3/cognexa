import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import * as assessments from './assessments.controller'
import {
  assessmentParamsSchema,
  submissionParamsSchema,
  updateSubmissionSchema,
} from './assessments.validation'

export const assessmentRouter = Router()

assessmentRouter.use(authenticate)

assessmentRouter.get(
  '/:courseId/:assessmentId',
  validate({ params: assessmentParamsSchema }),
  assessments.getAssessmentForLearner
)
assessmentRouter.post(
  '/:courseId/:assessmentId/attempts',
  validate({ params: assessmentParamsSchema }),
  assessments.startAttempt
)

assessmentRouter.get(
  '/submissions/:submissionId',
  validate({ params: submissionParamsSchema }),
  assessments.getSubmission
)
assessmentRouter.patch(
  '/submissions/:submissionId',
  validate({ params: submissionParamsSchema, body: updateSubmissionSchema }),
  assessments.updateSubmission
)
assessmentRouter.post(
  '/submissions/:submissionId/submit',
  validate({ params: submissionParamsSchema, body: updateSubmissionSchema }),
  assessments.submitSubmission
)

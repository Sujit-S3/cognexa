import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import * as lectures from './lectures.controller'

// Despite the module name, routes here cover any module item (video/pdf/markdown/rich_text/
// external_url/youtube/live_session/file), not literally just video lectures.
export const lectureRouter = Router({ mergeParams: true })

const createCommentSchema = z.object({ comment: z.string().trim().min(1).max(5_000) }).strict()
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')
const lectureParamsSchema = z.object({ courseId: objectId }).strict()
const moduleItemParamsSchema = z.object({ courseId: objectId, moduleItemId: objectId }).strict()
const commentParamsSchema = z
  .object({ courseId: objectId, moduleItemId: objectId, commentId: objectId })
  .strict()

lectureRouter.get('/', authenticate, validate({ params: lectureParamsSchema }), lectures.getAllVideos)
lectureRouter.get(
  '/:moduleItemId',
  authenticate,
  validate({ params: moduleItemParamsSchema }),
  lectures.getModuleItem
)
lectureRouter.post(
  '/:moduleItemId/complete',
  authenticate,
  validate({ params: moduleItemParamsSchema }),
  lectures.markComplete
)
lectureRouter.get(
  '/:moduleItemId/comments',
  authenticate,
  validate({ params: moduleItemParamsSchema }),
  lectures.getAllComments
)
lectureRouter.post(
  '/:moduleItemId/comments',
  authenticate,
  validate({ params: moduleItemParamsSchema, body: createCommentSchema }),
  lectures.createComment
)
lectureRouter.delete(
  '/:moduleItemId/comments/:commentId',
  authenticate,
  validate({ params: commentParamsSchema }),
  lectures.deleteComment
)

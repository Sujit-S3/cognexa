import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import * as lectures from './lectures.controller'

export const lectureRouter = Router({ mergeParams: true })

lectureRouter.get('/', lectures.getAllVideos)
lectureRouter.get('/:moduleItemId/comments', lectures.getAllComments)
lectureRouter.post('/:moduleItemId/comments', authenticate, lectures.createComment)
lectureRouter.delete('/:moduleItemId/comments/:commentId', authenticate, lectures.deleteComment)

import { Request, Response } from 'express'
import { Course } from '../../models/course.model'
import { LectureComments } from '../../models/lectureComments.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { assertCourseRole } from '../../utils/courseAccess'

async function requireCourseMember(req: Request) {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['student', 'instructor', 'admin'])
  return course
}

export const getAllVideos = asyncHandler(async (req: Request, res: Response) => {
  const course = await requireCourseMember(req)
  res.json(course.getVideos())
})

export const getAllComments = asyncHandler(async (req: Request, res: Response) => {
  await requireCourseMember(req)
  const comments = await LectureComments.findOne({ moduleItemId: req.params.moduleItemId }).populate(
    'comments.user',
    '_id name username photo'
  )
  res.json(comments ?? {})
})

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  await requireCourseMember(req)
  const { courseId, moduleItemId } = req.params
  const { comment } = req.body
  if (!comment) throw new AppError(400, 'missing comment')

  let lectureComments = await LectureComments.findOne({ moduleItemId })
  if (!lectureComments) lectureComments = new LectureComments({ courseId, moduleItemId, comments: [] })

  lectureComments.comments.push({ user: req.user!._id, comment } as never)
  await lectureComments.save()
  await lectureComments.populate('comments.user', '_id name username photo')

  res.json(lectureComments)
})

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  await requireCourseMember(req)
  const { moduleItemId, commentId } = req.params
  if (!commentId) throw new AppError(400, 'Missing comment id')

  const lectureComments = await LectureComments.findOne({ moduleItemId })
  if (!lectureComments) throw new AppError(404, 'Lecture comments not found')

  const comment = lectureComments.comments.id(commentId)
  if (!comment) throw new AppError(404, 'Comment not found')

  // Only the comment's author (or an instructor/admin) may delete it.
  if (comment.user.toString() !== req.user!._id.toString() && req.user!.role === 'student') {
    throw new AppError(403, 'You cannot delete this comment')
  }

  lectureComments.comments.pull(commentId)
  await lectureComments.save()
  await lectureComments.populate('comments.user', '_id name username photo')

  res.json(lectureComments)
})

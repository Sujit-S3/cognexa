import { Request, Response } from 'express'
import { Course, YOUTUBE_ID_REGEX } from '../../models/course.model'
import { LectureComments } from '../../models/lectureComments.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { assertCourseRole, canModerateCourse, getEnrollment } from '../../utils/courseAccess'
import { evaluateCourseCompletion } from '../../services/achievement.service'

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

// Playback detail for a single module item (any lesson type, not just video — this module
// predates and now outgrows its "lectures" name). Enrolled members only; instructors/admins can
// preview content they manage even without a per-course enrollment.
export const getModuleItem = asyncHandler(async (req: Request, res: Response) => {
  const course = await requireCourseMember(req)
  const { moduleItemId } = req.params
  if (!moduleItemId) throw new AppError(400, 'Missing module item id')
  const item = course.getModuleItem(moduleItemId)
  if (!item) throw new AppError(404, 'Module item not found')

  const enrollment = getEnrollment(course, req.user!._id)
  const completed = enrollment?.completedItems.some((id) => id.toString() === item._id.toString()) ?? false

  if (enrollment) {
    await Course.updateOne(
      { _id: course._id, 'enrollments.user': req.user!._id },
      { $set: { 'enrollments.$.lastAccessedItemId': item._id, 'enrollments.$.lastAccessedAt': new Date() } }
    )
  }

  const videoId = item.type === 'youtube' && item.url ? YOUTUBE_ID_REGEX.exec(item.url)?.[1] : undefined

  res.json({ ...item.toJSON(), completed, videoId })
})

// Idempotent: $addToSet never duplicates or races under concurrent completion requests, and
// progress is always recomputed server-side afterward rather than trusted from the client.
export const markComplete = asyncHandler(async (req: Request, res: Response) => {
  const course = await requireCourseMember(req)
  const { moduleItemId } = req.params
  if (!moduleItemId) throw new AppError(400, 'Missing module item id')
  const item = course.getModuleItem(moduleItemId)
  if (!item) throw new AppError(404, 'Module item not found')

  const enrollment = getEnrollment(course, req.user!._id)
  if (!enrollment) throw new AppError(409, 'Progress tracking requires an enrollment on this course')

  await Course.updateOne(
    { _id: course._id, 'enrollments.user': req.user!._id },
    {
      $addToSet: { 'enrollments.$.completedItems': item._id },
      $set: { 'enrollments.$.lastAccessedItemId': item._id, 'enrollments.$.lastAccessedAt': new Date() },
    }
  )

  const updated = await Course.findById(course._id).orFail(() => new AppError(404, 'Course not found'))
  await evaluateCourseCompletion(updated, req.user!._id)
  res.json(updated.computeProgress(req.user!._id))
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
  const course = await requireCourseMember(req)
  const { moduleItemId, commentId } = req.params
  if (!commentId) throw new AppError(400, 'Missing comment id')

  const lectureComments = await LectureComments.findOne({ moduleItemId })
  if (!lectureComments) throw new AppError(404, 'Lecture comments not found')

  const comment = lectureComments.comments.id(commentId)
  if (!comment) throw new AppError(404, 'Comment not found')

  // Only the comment's author (or an instructor/admin) may delete it.
  if (
    comment.user.toString() !== req.user!._id.toString() &&
    !canModerateCourse(course, req.user!._id, req.user!.role)
  ) {
    throw new AppError(403, 'You cannot delete this comment')
  }

  lectureComments.comments.pull(commentId)
  await lectureComments.save()
  await lectureComments.populate('comments.user', '_id name username photo')

  res.json(lectureComments)
})

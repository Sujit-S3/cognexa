import { Request, Response } from 'express'
import { Course, type CourseDocument } from '../../models/course.model'
import { User } from '../../models/user.model'
import { Achievement } from '../../models/achievement.model'
import { GradesSummary } from '../../models/gradesSummary.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { assertCourseRole, getEnrollment } from '../../utils/courseAccess'
import { requireParam } from '../../utils/httpParams'

function serializePublicCourse(course: CourseDocument): Record<string, unknown> {
  const result = course.toJSON() as unknown as Record<string, unknown> & {
    modules?: Array<{ moduleItems?: Array<Record<string, unknown>> }>
    assessments?: Array<Record<string, unknown>>
  }
  delete result.enrollments
  delete result.files
  result.enrolled = false
  result.modules = result.modules?.map((module) => ({
    ...module,
    moduleItems: module.moduleItems?.map(({ url: _url, content: _content, asset: _asset, ...item }) => item),
  }))
  delete result.assessments
  return result
}

export const getAllCourses = asyncHandler(async (req: Request, res: Response) => {
  const filter = req.query.filter as string | undefined
  if (!req.user) {
    const courses = await Course.find({ status: 'published' })
      .populate('createdBy', '_id name username photo')
      .sort({ createdAt: -1 })
    res.set('cache-control', 'public, max-age=60').json(courses.map(serializePublicCourse))
    return
  }

  const courses = await Course.getCoursesWithPrivilege(req.user._id, req.user.role)
  const result = filter ? courses.filter((course: { status: string }) => course.status === filter) : courses
  res.json(result)
})

export const getOneCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId)
    .populate('createdBy', '_id name username photo')
    .orFail(() => new AppError(404, 'Course not found'))
  if (!req.user) {
    if (course.status !== 'published') throw new AppError(404, 'Course not found')
    res.json(serializePublicCourse(course))
    return
  }

  const enrollment = getEnrollment(course, req.user._id)
  const canManage =
    req.user.role === 'admin' || ['instructor', 'admin'].includes(enrollment?.enrolledAs ?? '')
  if (canManage) {
    res.json(course)
    return
  }
  if (course.status !== 'published') throw new AppError(404, 'Course not found')
  res.json(serializePublicCourse(course))
})

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const { courseName, description, image } = req.body
  if (!courseName) throw new AppError(400, 'missing courseName')

  const user = req.user!

  let course = new Course({
    name: courseName,
    description: description ?? '',
    createdBy: user._id,
    lastEditedBy: user._id,
    image,
    status: 'draft',
    pricing: { model: 'free', amount: 0, currency: 'USD' },
  })
  course.enroll(user._id, user.role)
  course = await course.save()

  user.enrollments.push(course._id)
  await user.save()

  res.status(201).json(await Course.getCoursesWithPrivilege(user._id, user.role))
})

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const { name, description, image, status, backgroundColor } = req.body
  if (name !== undefined) course.name = name
  if (description !== undefined) course.description = description
  if (image !== undefined) course.image = image
  if (status !== undefined) {
    if (!['draft', 'archived'].includes(status)) {
      throw new AppError(409, 'Use the instructor publish workflow to review or publish a course')
    }
    course.status = status
  }
  if (backgroundColor !== undefined) course.backgroundColor = backgroundColor

  await course.save()
  await course.populate('enrollments.user createdBy', '_id name username email code photo')

  res.json(course)
})

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  for (const enrollment of course.enrollments) {
    await User.updateOne({ _id: enrollment.user }, { $pull: { enrollments: course._id } })
  }
  await course.deleteOne()

  res.status(204).end()
})

export const endCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const gradeRecords = await GradesSummary.getGradesByUser(requireParam(req, 'courseId'))

  await Promise.all(
    gradeRecords.map((studentGrade) =>
      Achievement.create({
        user: studentGrade.user,
        course: studentGrade.course,
        score: studentGrade.score,
        gradeLetter: studentGrade.gradeLetter,
      })
    )
  )

  course.status = 'archived'
  await course.save()

  res.status(204).end()
})

export const enroll = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params.courseId
  const requester = req.user!
  const targetUserId = (req.body.userId as string | undefined) ?? requester._id.toString()

  const course = await Course.findById(courseId).orFail(() => new AppError(404, 'Course not found'))

  // Only self-enrollment is allowed unless the requester already manages this course.
  if (targetUserId !== requester._id.toString()) {
    assertCourseRole(course, requester._id, requester.role, ['instructor', 'admin'])
  }

  const targetUser = await User.findById(targetUserId).orFail(() => new AppError(404, 'User not found'))

  course.enroll(targetUser._id, targetUser.role)
  await course.save()

  targetUser.enrollments.push(course._id)
  await targetUser.save()

  res.json(await Course.getCoursesWithPrivilege(targetUserId, targetUser.role))
})

export const unEnroll = asyncHandler(async (req: Request, res: Response) => {
  const courseId = req.params.courseId
  const requester = req.user!
  const targetUserId = (req.body.userId as string | undefined) ?? requester._id.toString()

  const course = await Course.findById(courseId).orFail(() => new AppError(404, 'Course not found'))

  if (targetUserId !== requester._id.toString()) {
    assertCourseRole(course, requester._id, requester.role, ['instructor', 'admin'])
  }

  const targetUser = await User.findById(targetUserId).orFail(() => new AppError(404, 'User not found'))

  course.unEnroll(targetUser._id)
  await course.save()

  targetUser.enrollments = targetUser.enrollments.filter((e) => e.toString() !== courseId)
  await targetUser.save()

  res.json(await Course.getCoursesWithPrivilege(targetUserId, targetUser.role))
})

export const getEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId)
    .populate('enrollments.user')
    .orFail(() => new AppError(404, 'Course not found'))

  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  res.json(course.enrollments)
})

export const updateEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId)
    .populate('enrollments.user')
    .orFail(() => new AppError(404, 'Course not found'))

  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const enrollmentToUpdate = course.enrollments.id(req.body.enrollmentId)
  if (!enrollmentToUpdate) throw new AppError(404, 'Enrollment not found')

  enrollmentToUpdate.enrolledAs = req.body.enrolledAs
  const result = await course.save()

  res.json(result.enrollments)
})

export const getDeadLines = asyncHandler(async (req: Request, res: Response) => {
  const results = await Promise.all(req.user!.enrollments.map((courseId) => Course.getDeadLines(courseId)))
  res.json(results.flat())
})

export const getDeadLinesCalendar = asyncHandler(async (req: Request, res: Response) => {
  const results = await Promise.all(req.user!.enrollments.map((courseId) => Course.getDeadLines(courseId)))
  res.json(Course.formatCalendar(results.flat() as never))
})

export { getEnrollment }

import { Request, Response } from 'express'
import { Course, type CourseDocument } from '../../models/course.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { assertCourseRole, getEnrollment } from '../../utils/courseAccess'
import { requireParam } from '../../utils/httpParams'

function canViewProtectedCurriculum(course: CourseDocument | null, req: Request) {
  if (!course || !req.user) return false
  return req.user.role === 'admin' || Boolean(getEnrollment(course, req.user._id))
}

function publicModule(module: { toJSON(): unknown }): Record<string, unknown> {
  const result = module.toJSON() as unknown as Record<string, unknown> & {
    moduleItems?: Array<Record<string, unknown>>
  }
  result.moduleItems = result.moduleItems?.map(
    ({ url: _url, content: _content, asset: _asset, ...item }) => item
  )
  return result
}

export const getAllModules = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  const canViewFull = canViewProtectedCurriculum(course, req)
  if (course.status !== 'published' && !canViewFull) throw new AppError(404, 'Course not found')

  res
    .set('cache-control', canViewFull ? 'private, no-store' : 'public, max-age=60')
    .json(canViewFull ? course.modulesJSON() : { modules: course.modules.map(publicModule) })
})

export const getOneModule = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  const result = course.modules.id(requireParam(req, 'id'))
  if (!result) throw new AppError(404, 'Module not found')
  const canViewFull = canViewProtectedCurriculum(course, req)
  if (course.status !== 'published' && !canViewFull) throw new AppError(404, 'Course not found')
  res
    .set('cache-control', canViewFull ? 'private, no-store' : 'public, max-age=60')
    .json(canViewFull ? result.toJSON() : publicModule(result))
})

export const createModule = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body.title) throw new AppError(400, 'missing Module title')

  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  course.modules.push({
    title: req.body.title,
    description: req.body.description,
    order: course.modules.length,
    moduleItems: [],
  } as never)
  const updatedCourse = await course.save()

  res.json(updatedCourse.modulesJSON())
})

export const updateModule = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const updatedModule = course.modules.id(requireParam(req, 'id'))
  if (!updatedModule) throw new AppError(404, 'Module not found')

  if (req.body.title !== undefined) updatedModule.title = req.body.title
  if (req.body.description !== undefined) updatedModule.description = req.body.description
  if (req.body.order !== undefined) updatedModule.order = req.body.order
  const result = await course.save()

  res.json(result.modulesJSON())
})

export const deleteModule = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const moduleToDelete = course.modules.id(requireParam(req, 'id'))
  if (!moduleToDelete) throw new AppError(404, 'Module not found')

  course.modules.pull(req.params.id)
  const result = await course.save()

  res.json(result.modulesJSON())
})

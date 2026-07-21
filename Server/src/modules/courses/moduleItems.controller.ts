import { Request, Response } from 'express'
import { Course } from '../../models/course.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { assertCourseRole } from '../../utils/courseAccess'
import { requireParam } from '../../utils/httpParams'

// NOTE: none of these endpoints had `auth` wired in the original router at all — any anonymous
// caller could create/edit/delete course content. Now requires authentication + instructor/admin
// role on the specific course (enforced in the route layer + here).

export const createModuleItem = asyncHandler(async (req: Request, res: Response) => {
  const { title, type, url, content, description, durationMinutes, isPreview, asset } = req.body
  if (!title) throw new AppError(400, 'missing module item title')
  if (!type) throw new AppError(400, 'missing module item type')

  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const targetModule = course.modules.id(requireParam(req, 'moduleId'))
  if (!targetModule) throw new AppError(404, 'Module not found')

  targetModule.moduleItems.push({
    title,
    type,
    url,
    content,
    description,
    durationMinutes,
    isPreview: Boolean(isPreview),
    asset,
    order: targetModule.moduleItems.length,
  } as never)
  const updatedCourse = await course.save()

  res.json(updatedCourse.modulesJSON())
})

export const updateModuleItem = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const targetModule = course.modules.id(requireParam(req, 'moduleId'))
  if (!targetModule) throw new AppError(404, 'Module not found')

  const targetModuleItem = targetModule.moduleItems.id(requireParam(req, 'id'))
  if (!targetModuleItem) throw new AppError(404, 'Module item not found')

  const { title, type, url, content, description, durationMinutes, isPreview, asset, order } = req.body
  if (title !== undefined) targetModuleItem.title = title
  if (type !== undefined) targetModuleItem.type = type
  if (url !== undefined) targetModuleItem.url = url
  if (content !== undefined) targetModuleItem.content = content
  if (description !== undefined) targetModuleItem.description = description
  if (durationMinutes !== undefined) targetModuleItem.durationMinutes = durationMinutes
  if (isPreview !== undefined) targetModuleItem.isPreview = isPreview
  if (asset !== undefined) targetModuleItem.asset = asset
  if (order !== undefined) targetModuleItem.order = order

  const updatedCourse = await course.save()
  res.json(updatedCourse.modulesJSON())
})

export const deleteModuleItem = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const targetModule = course.modules.id(requireParam(req, 'moduleId'))
  if (!targetModule) throw new AppError(404, 'Module not found')

  const targetModuleItem = targetModule.moduleItems.id(requireParam(req, 'id'))
  if (!targetModuleItem) throw new AppError(404, 'Module item not found')

  targetModule.moduleItems.pull(req.params.id)
  const updatedCourse = await course.save()

  res.json(updatedCourse.modulesJSON())
})

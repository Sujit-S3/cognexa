import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../../middleware/auth'
import { requireRole } from '../../middleware/rbac'
import { validate } from '../../middleware/validate'
import * as courses from './courses.controller'
import * as modules from './modules.controller'
import * as moduleItems from './moduleItems.controller'
import {
  courseAndChildIdParamsSchema,
  courseIdParamsSchema,
  createCourseSchema,
  createModuleItemSchema,
  createModuleSchema,
  enrollmentSchema,
  moduleItemParamsSchema,
  updateCourseSchema,
  updateEnrollmentSchema,
  updateModuleItemSchema,
  updateModuleSchema,
} from './courses.validation'

export const courseRouter = Router()

courseRouter.post(
  '/',
  authenticate,
  requireRole('instructor', 'admin'),
  validate({ body: createCourseSchema }),
  courses.createCourse
)
courseRouter.get(
  '/:courseId',
  optionalAuthenticate,
  validate({ params: courseIdParamsSchema }),
  courses.getOneCourse
)
courseRouter.get('/', optionalAuthenticate, courses.getAllCourses)
courseRouter.put(
  '/:courseId',
  authenticate,
  validate({ params: courseIdParamsSchema, body: updateCourseSchema }),
  courses.updateCourse
)
courseRouter.delete(
  '/:courseId',
  authenticate,
  validate({ params: courseIdParamsSchema }),
  courses.deleteCourse
)
courseRouter.post(
  '/:courseId/end-course',
  authenticate,
  validate({ params: courseIdParamsSchema }),
  courses.endCourse
)
courseRouter.post(
  '/:courseId/enroll',
  authenticate,
  validate({ params: courseIdParamsSchema, body: enrollmentSchema }),
  courses.enroll
)
courseRouter.post(
  '/:courseId/un-enroll',
  authenticate,
  validate({ params: courseIdParamsSchema, body: enrollmentSchema }),
  courses.unEnroll
)

courseRouter.get(
  '/:courseId/enrollments',
  authenticate,
  validate({ params: courseIdParamsSchema }),
  courses.getEnrollments
)
courseRouter.post(
  '/:courseId/enrollments',
  authenticate,
  validate({ params: courseIdParamsSchema, body: updateEnrollmentSchema }),
  courses.updateEnrollment
)

courseRouter.get(
  '/:courseId/modules',
  optionalAuthenticate,
  validate({ params: courseIdParamsSchema }),
  modules.getAllModules
)
courseRouter.get(
  '/:courseId/modules/:id',
  optionalAuthenticate,
  validate({ params: courseAndChildIdParamsSchema }),
  modules.getOneModule
)
courseRouter.post(
  '/:courseId/modules',
  authenticate,
  validate({ params: courseIdParamsSchema, body: createModuleSchema }),
  modules.createModule
)
courseRouter.put(
  '/:courseId/modules/:id',
  authenticate,
  validate({ params: courseAndChildIdParamsSchema, body: updateModuleSchema }),
  modules.updateModule
)
courseRouter.delete(
  '/:courseId/modules/:id',
  authenticate,
  validate({ params: courseAndChildIdParamsSchema }),
  modules.deleteModule
)

courseRouter.post(
  '/:courseId/modules/:moduleId/module-item',
  authenticate,
  validate({ params: moduleItemParamsSchema, body: createModuleItemSchema }),
  moduleItems.createModuleItem
)
courseRouter.put(
  '/:courseId/modules/:moduleId/module-item/:id',
  authenticate,
  validate({ params: moduleItemParamsSchema, body: updateModuleItemSchema }),
  moduleItems.updateModuleItem
)
courseRouter.delete(
  '/:courseId/modules/:moduleId/module-item/:id',
  authenticate,
  validate({ params: moduleItemParamsSchema }),
  moduleItems.deleteModuleItem
)

export const deadlinesRouter = Router()
deadlinesRouter.get('/', authenticate, courses.getDeadLines)
deadlinesRouter.get('/calendar', authenticate, courses.getDeadLinesCalendar)

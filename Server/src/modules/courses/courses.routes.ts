import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../../middleware/auth'
import * as courses from './courses.controller'
import * as modules from './modules.controller'
import * as moduleItems from './moduleItems.controller'

export const courseRouter = Router()

courseRouter.post('/', authenticate, courses.createCourse)
courseRouter.get('/:courseId', optionalAuthenticate, courses.getOneCourse)
courseRouter.get('/', optionalAuthenticate, courses.getAllCourses)
courseRouter.put('/:courseId', authenticate, courses.updateCourse)
courseRouter.delete('/:courseId', authenticate, courses.deleteCourse)
courseRouter.post('/:courseId/end-course', authenticate, courses.endCourse)
courseRouter.post('/:courseId/enroll', authenticate, courses.enroll)
courseRouter.post('/:courseId/un-enroll', authenticate, courses.unEnroll)

courseRouter.get('/:courseId/enrollments', authenticate, courses.getEnrollments)
courseRouter.post('/:courseId/enrollments', authenticate, courses.updateEnrollment)

courseRouter.get('/:courseId/modules', optionalAuthenticate, modules.getAllModules)
courseRouter.get('/:courseId/modules/:id', optionalAuthenticate, modules.getOneModule)
courseRouter.post('/:courseId/modules', authenticate, modules.createModule)
courseRouter.put('/:courseId/modules/:id', authenticate, modules.updateModule)
courseRouter.delete('/:courseId/modules/:id', authenticate, modules.deleteModule)

courseRouter.post('/:courseId/modules/:moduleId/module-item', authenticate, moduleItems.createModuleItem)
courseRouter.put('/:courseId/modules/:moduleId/module-item/:id', authenticate, moduleItems.updateModuleItem)
courseRouter.delete(
  '/:courseId/modules/:moduleId/module-item/:id',
  authenticate,
  moduleItems.deleteModuleItem
)

export const deadlinesRouter = Router()
deadlinesRouter.get('/', authenticate, courses.getDeadLines)
deadlinesRouter.get('/calendar', authenticate, courses.getDeadLinesCalendar)

import { Types } from 'mongoose'
import { CourseDocument, EnrollmentRole } from '../models/course.model'
import { AppError } from './AppError'

export function getEnrollment(course: CourseDocument, userId: Types.ObjectId | string) {
  return course.enrollments.find((e) => e.user.toString() === userId.toString())
}

// Throws 403 unless the user is a global admin or holds one of `allowed` roles on this specific course.
export function assertCourseRole(
  course: CourseDocument,
  userId: Types.ObjectId | string,
  globalRole: string,
  allowed: EnrollmentRole[]
): void {
  if (globalRole === 'admin') return

  const enrollment = getEnrollment(course, userId)
  if (!enrollment || !allowed.includes(enrollment.enrolledAs)) {
    throw new AppError(403, 'You do not have permission to perform this action on this course')
  }
}

export function assertSelfEnrollmentOpen(
  course: CourseDocument,
  userId: Types.ObjectId | string,
  globalRole: string
): void {
  if (course.status === 'published') return
  assertCourseRole(course, userId, globalRole, ['instructor', 'admin'])
}

export function canModerateCourse(
  course: CourseDocument,
  userId: Types.ObjectId | string,
  globalRole: string
): boolean {
  if (globalRole === 'admin') return true
  const enrollment = getEnrollment(course, userId)
  return ['instructor', 'admin'].includes(enrollment?.enrolledAs ?? '')
}

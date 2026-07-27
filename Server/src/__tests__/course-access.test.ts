import { describe, expect, it } from 'vitest'
import { Course } from '../models/course.model'
import { assertSelfEnrollmentOpen, canModerateCourse } from '../utils/courseAccess'

const userId = '507f1f77bcf86cd799439011'

describe('course enrollment access', () => {
  it('allows self-enrollment in a published course', () => {
    const course = new Course({
      name: 'Published course',
      createdBy: '507f191e810c19729de860ea',
      status: 'published',
    })

    expect(() => assertSelfEnrollmentOpen(course, userId, 'student')).not.toThrow()
  })

  it('rejects student self-enrollment in an unpublished course', () => {
    const course = new Course({
      name: 'Draft course',
      createdBy: '507f191e810c19729de860ea',
      status: 'draft',
    })

    expect(() => assertSelfEnrollmentOpen(course, userId, 'student')).toThrow('You do not have permission')
  })

  it('does not grant moderation from a global instructor role alone', () => {
    const course = new Course({
      name: 'Another instructor course',
      createdBy: '507f191e810c19729de860ea',
      status: 'published',
      enrollments: [{ user: userId, enrolledAs: 'student' }],
    })

    expect(canModerateCourse(course, userId, 'instructor')).toBe(false)
    expect(canModerateCourse(course, userId, 'admin')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import {
  courseIdParamsSchema,
  createCourseSchema,
  createModuleItemSchema,
  enrollmentSchema,
  updateCourseSchema,
} from '../modules/courses/courses.validation'

describe('course route validation', () => {
  it('accepts the supported course payload', () => {
    expect(
      createCourseSchema.parse({
        courseName: 'Secure API design',
        description: 'A production course',
        image: 'https://cdn.example.com/course.webp',
      })
    ).toMatchObject({ courseName: 'Secure API design' })
  })

  it('rejects malformed identifiers and unknown fields', () => {
    expect(() => courseIdParamsSchema.parse({ courseId: 'not-an-object-id' })).toThrow()
    expect(() => enrollmentSchema.parse({ role: 'admin' })).toThrow()
  })

  it('rejects empty updates and unsupported status transitions', () => {
    expect(() => updateCourseSchema.parse({})).toThrow()
    expect(() => updateCourseSchema.parse({ status: 'published' })).toThrow()
  })

  it('bounds module content and requires valid external URLs', () => {
    expect(() =>
      createModuleItemSchema.parse({
        title: 'Unsafe link',
        type: 'external_url',
        url: 'javascript:alert(1)',
      })
    ).toThrow()
    expect(() =>
      createModuleItemSchema.parse({
        title: 'Oversized content',
        type: 'markdown',
        content: 'x'.repeat(100_001),
      })
    ).toThrow()
  })
})

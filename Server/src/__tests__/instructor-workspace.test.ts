import { beforeAll, describe, expect, it } from 'vitest'

process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let Course: typeof import('../models/course.model').Course
let collectPublishIssues: typeof import('../modules/instructor/instructor.controller').collectPublishIssues
let validateUploadIntent: typeof import('../modules/instructor/instructor.controller').validateUploadIntent
let courseWorkspaceSchema: typeof import('../modules/instructor/instructor.validation').courseWorkspaceSchema
let createCourseDraftSchema: typeof import('../modules/instructor/instructor.validation').createCourseDraftSchema
let signCloudinaryParameters: typeof import('../services/storage/cloudinary.service').signCloudinaryParameters

beforeAll(async () => {
  ;({ Course } = await import('../models/course.model'))
  ;({ collectPublishIssues, validateUploadIntent } =
    await import('../modules/instructor/instructor.controller'))
  ;({ courseWorkspaceSchema, createCourseDraftSchema } =
    await import('../modules/instructor/instructor.validation'))
  ;({ signCloudinaryParameters } = await import('../services/storage/cloudinary.service'))
})

describe('instructor workspace domain', () => {
  it('allows an incomplete course to be persisted as a draft', () => {
    expect(createCourseDraftSchema.parse({ name: 'Untitled course' })).toEqual({
      name: 'Untitled course',
    })
  })

  it('validates the complete workspace contract and rejects unknown data', () => {
    const base = {
      draftVersion: 1,
      name: 'Systems Thinking for Product Teams',
      description: '',
      tags: [],
      language: 'English',
      level: 'all-levels' as const,
      prerequisites: [],
      pricing: { model: 'free' as const, amount: 0, currency: 'usd' },
      seo: {},
      modules: [],
      assessments: [],
    }

    expect(courseWorkspaceSchema.parse(base).pricing.currency).toBe('USD')
    expect(() => courseWorkspaceSchema.parse({ ...base, internalRole: 'admin' })).toThrow()
  })

  it('reports publish blockers for incomplete drafts and accepts complete course content', () => {
    const draft = new Course({
      name: 'Untitled course',
      createdBy: '507f1f77bcf86cd799439011',
      tags: [],
      prerequisites: [],
      pricing: { model: 'free', amount: 0, currency: 'USD' },
      seo: {},
      modules: [],
      assessments: [],
    })
    expect(collectPublishIssues(draft)).toContain('Add a course title')

    const ready = new Course({
      name: 'Systems Thinking for Product Teams',
      description:
        'A practical course for applying systems thinking to complex product and organizational decisions.',
      createdBy: '507f1f77bcf86cd799439011',
      thumbnail: { url: 'https://res.cloudinary.com/demo/image/upload/course.jpg' },
      category: 'Leadership',
      tags: ['systems-thinking'],
      language: 'English',
      level: 'intermediate',
      prerequisites: ['Product fundamentals'],
      pricing: { model: 'free', amount: 0, currency: 'USD' },
      seo: {
        title: 'Systems Thinking for Product Teams',
        description: 'Learn practical systems thinking for complex product decisions.',
        slug: 'systems-thinking-product-teams',
      },
      modules: [
        {
          title: 'Foundations',
          order: 0,
          moduleItems: [
            {
              title: 'Introduction',
              type: 'markdown',
              order: 0,
              content: '# Welcome',
              isPreview: true,
            },
          ],
        },
      ],
      assessments: [],
    })

    expect(ready.validateSync()).toBeUndefined()
    expect(collectPublishIssues(ready)).toEqual([])
  })

  it('creates deterministic Cloudinary signatures from sorted parameters', () => {
    const secret = 'test-secret'
    expect(signCloudinaryParameters({ timestamp: 123, folder: 'courses/1' }, secret)).toBe(
      signCloudinaryParameters({ folder: 'courses/1', timestamp: 123 }, secret)
    )
  })

  it('rejects unsafe or purpose-mismatched upload intents before signing', () => {
    expect(() => validateUploadIntent('lesson-file', 'raw', 'lesson.pdf')).not.toThrow()
    expect(() => validateUploadIntent('lesson-file', 'raw', 'installer.exe')).toThrow(
      'The selected file type is not allowed'
    )
    expect(() => validateUploadIntent('lesson-video', 'raw', 'lesson.mp4')).toThrow()
  })
})

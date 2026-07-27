import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')
const title = z.string().trim().min(1).max(160)
const description = z.string().max(2_000)
const httpUrl = z
  .string()
  .url()
  .max(2_048)
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'URL must use HTTP or HTTPS')

const uploadedAssetSchema = z
  .object({
    url: httpUrl,
    publicId: z.string().max(512).optional(),
    resourceType: z.enum(['image', 'video', 'raw']).optional(),
    format: z.string().max(32).optional(),
    bytes: z.number().int().nonnegative().max(5_000_000_000).optional(),
    originalName: z.string().max(512).optional(),
    thumbnailUrl: httpUrl.optional(),
  })
  .strict()

export const courseIdParamsSchema = z.object({ courseId: objectId }).strict()
export const courseAndChildIdParamsSchema = z.object({ courseId: objectId, id: objectId }).strict()
export const moduleItemParamsSchema = z
  .object({ courseId: objectId, moduleId: objectId, id: objectId.optional() })
  .strict()

export const createCourseSchema = z
  .object({
    courseName: title,
    description: description.optional(),
    image: httpUrl.optional(),
  })
  .strict()

export const updateCourseSchema = z
  .object({
    name: title.optional(),
    description: description.optional(),
    image: httpUrl.optional(),
    status: z.enum(['draft', 'archived']).optional(),
    backgroundColor: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

export const enrollmentSchema = z.object({ userId: objectId.optional() }).strict().default({})

export const updateEnrollmentSchema = z
  .object({
    enrollmentId: objectId,
    enrolledAs: z.enum(['student', 'instructor', 'admin']),
  })
  .strict()

export const createModuleSchema = z.object({ title, description: description.optional() }).strict()

export const updateModuleSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    order: z.number().int().nonnegative().max(10_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

const moduleItemFields = {
  title,
  type: z.enum(['video', 'pdf', 'markdown', 'rich_text', 'external_url', 'youtube', 'live_session', 'file']),
  url: httpUrl.optional(),
  content: z.string().max(100_000).optional(),
  description: description.optional(),
  durationMinutes: z.number().nonnegative().max(100_000).optional(),
  isPreview: z.boolean().optional(),
  asset: uploadedAssetSchema.optional(),
}

export const createModuleItemSchema = z.object(moduleItemFields).strict()
export const updateModuleItemSchema = z
  .object({
    title: title.optional(),
    type: moduleItemFields.type.optional(),
    url: httpUrl.optional(),
    content: moduleItemFields.content,
    description: description.optional(),
    durationMinutes: moduleItemFields.durationMinutes,
    isPreview: moduleItemFields.isPreview,
    asset: uploadedAssetSchema.optional(),
    order: z.number().int().nonnegative().max(10_000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required')

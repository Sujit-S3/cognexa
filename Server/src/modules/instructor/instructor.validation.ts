import { z } from 'zod'

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i)
const identifierFields = {
  _id: objectIdSchema.optional(),
  id: objectIdSchema.optional(),
}

export const uploadedAssetSchema = z
  .object({
    url: z.string().url().max(2_048),
    publicId: z.string().max(500).optional(),
    resourceType: z.enum(['image', 'video', 'raw']).optional(),
    format: z.string().max(20).optional(),
    bytes: z.number().int().nonnegative().max(10_000_000_000).optional(),
    originalName: z.string().max(255).optional(),
    thumbnailUrl: z.string().url().max(2_048).optional(),
  })
  .strict()

const lessonSchema = z
  .object({
    ...identifierFields,
    title: z.string().trim().min(1).max(160),
    type: z.enum([
      'video',
      'pdf',
      'markdown',
      'rich_text',
      'external_url',
      'youtube',
      'live_session',
      'file',
    ]),
    order: z.number().int().nonnegative(),
    description: z.string().max(2_000).optional(),
    url: z.string().url().max(2_048).optional(),
    content: z.string().max(100_000).optional(),
    durationMinutes: z.number().int().nonnegative().max(100_000).optional(),
    isPreview: z.boolean().default(false),
    asset: uploadedAssetSchema.optional(),
  })
  .strict()

const moduleSchema = z
  .object({
    ...identifierFields,
    title: z.string().trim().min(1).max(160),
    description: z.string().max(2_000).optional(),
    order: z.number().int().nonnegative(),
    moduleItems: z.array(lessonSchema).max(250),
  })
  .strict()

const questionSchema = z
  .object({
    ...identifierFields,
    prompt: z.string().trim().min(1).max(10_000),
    type: z.enum(['mcq', 'multiple_select', 'true_false', 'fill_blank']),
    options: z.array(z.string().max(2_000)).max(20).default([]),
    correctAnswers: z.array(z.string().min(1).max(2_000)).max(20).default([]),
    explanation: z.string().max(10_000).optional(),
    points: z.number().int().min(1).max(1_000),
    pool: z.string().trim().max(120).optional(),
  })
  .strict()

const rubricCriterionSchema = z
  .object({
    ...identifierFields,
    title: z.string().trim().min(1).max(160),
    description: z.string().max(2_000).optional(),
    points: z.number().nonnegative().max(10_000),
  })
  .strict()

const assessmentSchema = z
  .object({
    ...identifierFields,
    kind: z.enum(['quiz', 'assignment']),
    title: z.string().trim().min(1).max(160),
    instructions: z.string().max(100_000).optional(),
    order: z.number().int().nonnegative(),
    visibility: z.enum(['draft', 'published']),
    questions: z.array(questionSchema).max(500).default([]),
    randomizeQuestions: z.boolean().default(false),
    randomizeAnswers: z.boolean().default(false),
    passingScore: z.number().min(0).max(100).default(70),
    timeLimitMinutes: z.number().int().min(1).max(1_440).optional(),
    questionPoolSize: z.number().int().min(1).max(1_000).optional(),
    dueDate: z.coerce.date().optional(),
    attachments: z.array(uploadedAssetSchema).max(20).default([]),
    rubric: z.array(rubricCriterionSchema).max(50).default([]),
    submissionLimit: z.number().int().min(1).max(100).default(1),
  })
  .strict()

export const createCourseDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(160).default('Untitled course'),
  })
  .strict()

export const courseWorkspaceSchema = z
  .object({
    draftVersion: z.number().int().min(1).optional(),
    name: z.string().trim().min(1).max(160),
    subtitle: z.string().max(240).optional(),
    description: z.string().max(20_000).optional(),
    image: z.string().url().max(2_048).optional(),
    thumbnail: uploadedAssetSchema.optional(),
    banner: uploadedAssetSchema.optional(),
    category: z.string().trim().max(120).optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(30),
    language: z.string().trim().min(1).max(80),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'all-levels']),
    durationMinutes: z.number().int().nonnegative().max(1_000_000).optional(),
    prerequisites: z.array(z.string().trim().min(1).max(240)).max(50),
    pricing: z
      .object({
        model: z.enum(['free', 'paid']),
        amount: z.number().nonnegative().max(1_000_000),
        currency: z
          .string()
          .trim()
          .length(3)
          .transform((value) => value.toUpperCase()),
      })
      .strict(),
    seo: z
      .object({
        title: z.string().max(70).optional(),
        description: z.string().max(170).optional(),
        slug: z
          .string()
          .trim()
          .max(120)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens')
          .optional(),
      })
      .strict(),
    modules: z.array(moduleSchema).max(100),
    assessments: z.array(assessmentSchema).max(100),
  })
  .strict()

export const courseStatusTransitionSchema = z
  .object({
    status: z.enum(['draft', 'review', 'published', 'archived']),
    reviewNotes: z.string().max(5_000).optional(),
  })
  .strict()

export const uploadSignatureSchema = z
  .object({
    courseId: objectIdSchema,
    purpose: z.enum(['thumbnail', 'banner', 'lesson-video', 'lesson-file', 'assignment-file']),
    resourceType: z.enum(['image', 'video', 'raw']),
    originalName: z.string().trim().min(1).max(255),
  })
  .strict()

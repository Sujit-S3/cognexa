import { z } from 'zod'
import { uploadedAssetSchema } from '../instructor/instructor.validation'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier')

export const assessmentParamsSchema = z.object({ courseId: objectId, assessmentId: objectId }).strict()
export const submissionParamsSchema = z.object({ submissionId: objectId }).strict()

const answerSchema = z
  .object({
    questionId: objectId,
    response: z.array(z.string().max(2_000)).max(20),
  })
  .strict()

// Covers both quiz (answers) and assignment (text/attachments) drafts — the controller applies
// only the fields relevant to the submission's own kind.
export const updateSubmissionSchema = z
  .object({
    answers: z.array(answerSchema).max(500).optional(),
    text: z.string().max(50_000).optional(),
    attachments: z.array(uploadedAssetSchema).max(20).optional(),
  })
  .strict()

const rubricScoreSchema = z
  .object({
    criterionId: objectId,
    points: z.number().min(0).max(10_000),
  })
  .strict()

export const gradeSubmissionSchema = z
  .object({
    score: z.number().min(0).max(1_000_000).optional(),
    rubricScores: z.array(rubricScoreSchema).max(50).optional(),
    feedback: z.string().max(10_000).optional(),
  })
  .strict()

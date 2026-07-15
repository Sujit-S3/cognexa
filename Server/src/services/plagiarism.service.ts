import { Assessment } from '../models/assessment.model'
import { Submission } from '../models/submission.model'
import { Course, CourseDocument } from '../models/course.model'
import { aiService } from './ai'
import { pushNotification } from './push.service'
import { logger } from '../config/logger'
import { PlagiarismStatus } from '../models/submission.model'

async function notifyInstructors(course: CourseDocument, title: string): Promise<void> {
  await Promise.all(course.getInstructors().map((enrollment) => pushNotification(enrollment.user, { title })))
}

function plagiarismBand(similarity: number): PlagiarismStatus {
  if (similarity >= 0.75) return 'veryHigh'
  if (similarity >= 0.5) return 'high'
  if (similarity >= 0.25) return 'med'
  return 'none'
}

// Replaces helper/plagarismJob.js — text extraction + comparison now happens in the external AI
// service (called via the pluggable aiService client) instead of embedding a crawler + pairwise
// comparison algorithm directly in this backend.
export async function runPlagiarismCheck(courseId: string, assessmentId: string): Promise<void> {
  try {
    const submissions = await Submission.find({
      course: courseId,
      assessment: assessmentId,
      submittedAt: { $exists: true }
    })

    const pdfFiles = submissions.flatMap((submission) =>
      submission.files
        .filter((file) => file.url.toLowerCase().endsWith('.pdf'))
        .map((file) => ({ submissionId: submission._id.toString(), fileId: file._id.toString(), url: file.url }))
    )

    const matches = await aiService.checkPlagiarism(
      pdfFiles.map((file) => ({ submissionId: file.fileId, text: file.url }))
    )

    const worstSimilarityByFile = new Map<string, number>()
    matches.forEach((match) => {
      worstSimilarityByFile.set(
        match.submissionId,
        Math.max(worstSimilarityByFile.get(match.submissionId) ?? 0, match.similarity)
      )
    })

    for (const submission of submissions) {
      let worst = 0
      for (const file of submission.files) {
        const similarity = worstSimilarityByFile.get(file._id.toString())
        if (similarity !== undefined) {
          file.plagarismFileStatus = plagiarismBand(similarity)
          worst = Math.max(worst, similarity)
        }
      }
      submission.plagarismStatus = worst > 0 ? plagiarismBand(worst) : 'none'
      await submission.save()
    }

    const course = await Course.findById(courseId).orFail()
    const assessment = await Assessment.findById(assessmentId).orFail()
    await notifyInstructors(course, `Plagiarism check for ${assessment.title} done`)
  } catch (err) {
    logger.error({ err, courseId, assessmentId }, 'Plagiarism check job failed')

    await Submission.updateMany(
      { assessment: assessmentId, submittedAt: { $exists: true } },
      { plagarismStatus: 'unCalculated' }
    )
  }
}

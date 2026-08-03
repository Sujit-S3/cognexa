import { Types } from 'mongoose'
import { CourseDocument } from '../models/course.model'
import { Achievement } from '../models/achievement.model'
import { AssessmentSubmission } from '../models/assessmentSubmission.model'
import { generateCertificateCode } from './certificate.service'
import { createNotification } from './notification.service'
import { logger } from '../config/logger'

function gradeLetterFor(percent: number): string {
  if (percent < 60) return 'F'
  if (percent < 67) return 'D'
  if (percent < 76) return 'C'
  if (percent < 89) return 'B'
  return 'A'
}

// Idempotent: checks for an existing Achievement first, and only issues one once every required
// lesson is complete and every published assessment has at least one passing graded submission.
// Called from the two places completion signals originate — lectures.controller.ts#markComplete
// (module-item completion) and the quiz/assignment grading paths in assessments.controller.ts and
// instructor.controller.ts — so it naturally fires exactly when the last requirement is met,
// regardless of which kind of requirement that happened to be.
export async function evaluateCourseCompletion(
  course: CourseDocument,
  userId: Types.ObjectId | string
): Promise<void> {
  const existing = await Achievement.findOne({ course: course._id, user: userId })
  if (existing) return

  const progress = course.computeProgress(userId)
  if (!progress) return
  // A course with zero module items has nothing to complete — that requirement is trivially
  // satisfied, not blocking. Only bail here when there ARE items and some remain incomplete.
  if (progress.totalCount > 0 && progress.completedCount < progress.totalCount) return

  const publishedAssessments = course.assessments.filter(
    (assessment) => assessment.visibility === 'published'
  )

  const submissions = await AssessmentSubmission.find({
    course: course._id,
    student: userId,
    status: 'graded',
  })

  if (publishedAssessments.length > 0) {
    const passedByAssessment = new Map<string, boolean>()
    for (const submission of submissions) {
      const key = submission.courseAssessmentId.toString()
      passedByAssessment.set(key, Boolean(passedByAssessment.get(key)) || Boolean(submission.passed))
    }
    const allPassed = publishedAssessments.every((assessment) =>
      passedByAssessment.get(String(assessment._id))
    )
    if (!allPassed) return
  }

  const percentages = submissions
    .filter((submission) => (submission.maxScore ?? 0) > 0)
    .map((submission) => ((submission.score ?? 0) / (submission.maxScore ?? 1)) * 100)
  const averagePercent = percentages.length
    ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
    : 100

  // Not unique-indexed at the DB level (see achievement.model.ts) — a true race between two
  // completion signals firing within milliseconds of each other could in principle create two
  // Achievement records for the same learner/course. Accepted as a low-probability edge case
  // rather than adding an index migration/upgrade path for it.
  const achievement = await Achievement.create({
    user: userId,
    course: course._id,
    score: `${averagePercent}%`,
    gradeLetter: gradeLetterFor(averagePercent),
    finishedAt: new Date(),
    certificate: generateCertificateCode(),
  })

  await createNotification({
    user: userId,
    type: 'certificate_issued',
    title: 'Certificate earned',
    body: `You've completed "${course.name}" and earned a certificate.`,
    link: `/certificates/verify/${achievement.certificate}`,
  }).catch((error) => logger.error({ error }, 'Failed to create certificate-issued notification'))
}

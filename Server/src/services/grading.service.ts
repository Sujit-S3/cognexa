import { Assessment } from '../models/assessment.model'
import { Submission } from '../models/submission.model'
import { Course, CourseDocument } from '../models/course.model'
import { aiService } from './ai'
import { pushNotification } from './push.service'
import { logger } from '../config/logger'

interface PopulatedQuestion {
  question_text: string
  ans?: string
  points: number
}

interface PopulatedAssessment {
  submissionType: 'online' | 'written'
  title: string
}

async function notifyInstructors(course: CourseDocument, title: string): Promise<void> {
  await Promise.all(course.getInstructors().map((enrollment) => pushNotification(enrollment.user, { title })))
}

// Replaces helper/autoGradingJob.js — grading now goes through the pluggable AI service layer
// instead of a hardcoded axios call to 127.0.0.1:5000.
export async function runAutoGrading(courseId: string, assessmentId: string): Promise<void> {
  try {
    const submissions = await Submission.find({ assessment: assessmentId, submittedAt: { $exists: true } })
      .populate('answers.originQuestion')
      .populate('assessment')
      .exec()

    const assessment = await Assessment.findById(assessmentId).orFail()

    for (const submission of submissions) {
      const populatedAssessment = submission.assessment as unknown as PopulatedAssessment
      let results

      if (populatedAssessment.submissionType === 'online') {
        results = await aiService.gradeOnlineSubmission(
          submission.answers.map((answer) => {
            const question = answer.originQuestion as unknown as PopulatedQuestion
            return {
              questionText: question?.question_text ?? '',
              modelAnswer: question?.ans ?? '',
              studentAnswer: answer.studentAnswer,
              maxScore: question?.points ?? 0,
            }
          })
        )
      } else {
        const pdfFile = submission.files.find((file) => file.url.toLowerCase().endsWith('.pdf'))
        results = await aiService.gradeWrittenSubmission({
          modelAnswer: '',
          studentAnswerUrl: pdfFile?.url ?? '',
        })
      }

      submission.answers.forEach((answer, index) => {
        if (results[index]) answer.score = results[index]!.score
      })
      submission.autoGradingStatus = 'Graded'
      await submission.save()
    }

    const course = await Course.findById(courseId).orFail()
    await notifyInstructors(course, `Auto grading done for ${assessment.title}`)
  } catch (err) {
    logger.error({ err, courseId, assessmentId }, 'Auto grading job failed')

    await Submission.updateMany(
      { assessment: assessmentId, submittedAt: { $exists: true } },
      { autoGradingStatus: 'unGraded' }
    )

    const course = await Course.findById(courseId).catch(() => null)
    const assessment = await Assessment.findById(assessmentId).catch(() => null)
    if (course && assessment) await notifyInstructors(course, `Auto grading for ${assessment.title} failed`)
  }
}

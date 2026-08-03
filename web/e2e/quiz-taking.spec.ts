import { expect, test, type Page } from '@playwright/test'
import type { AssessmentForLearnerResponse, SubmissionView } from '../src/services/api'

const courseId = '507f1f77bcf86cd799439011'
const assessmentId = '507f1f77bcf86cd799439022'
const submissionId = '507f1f77bcf86cd799439033'
const questionId = '507f1f77bcf86cd799439044'

const student = {
  id: '507f1f77bcf86cd799439010',
  username: 'nora.learner',
  name: 'Nora Learner',
  email: 'nora@cognexa.test',
  photo: '',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  role: 'student',
}

let submission: SubmissionView | null = null

function buildSubmission(overrides: Partial<SubmissionView> = {}): SubmissionView {
  return {
    id: submissionId,
    course: courseId,
    courseAssessmentId: assessmentId,
    kind: 'quiz',
    student: student.id,
    status: 'in_progress',
    attemptNumber: 1,
    presentedQuestions: [
      { questionId, prompt: 'What is 2 + 2?', type: 'mcq', options: ['3', '4'], points: 1 },
    ],
    answers: [],
    startedAt: new Date().toISOString(),
    assessmentTitleSnapshot: 'Checkpoint quiz',
    ...overrides,
  }
}

async function mockLearnerApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/session')) return route.fulfill({ json: { hasSession: true } })
    if (url.pathname.endsWith('/auth/refresh')) {
      return route.fulfill({ json: { user: student, token: 'e2e-access-token' } })
    }
    if (url.pathname.endsWith(`/assessments/${courseId}/${assessmentId}`) && request.method() === 'GET') {
      const response: AssessmentForLearnerResponse = {
        assessment: {
          id: assessmentId,
          kind: 'quiz',
          title: 'Checkpoint quiz',
          instructions: 'Answer every question before submitting.',
          order: 0,
          visibility: 'published',
          randomizeQuestions: false,
          randomizeAnswers: false,
          passingScore: 70,
          attachments: [],
          rubric: [],
          submissionLimit: 2,
          questionCount: 1,
        },
        submission,
        attemptsUsed: 0,
        attemptsAllowed: 2,
      }
      return route.fulfill({ json: response })
    }
    if (
      url.pathname.endsWith(`/assessments/${courseId}/${assessmentId}/attempts`) &&
      request.method() === 'POST'
    ) {
      submission = buildSubmission()
      return route.fulfill({ status: 201, json: submission })
    }
    if (url.pathname.endsWith(`/assessments/submissions/${submissionId}`) && request.method() === 'PATCH') {
      submission = { ...buildSubmission(), ...request.postDataJSON() }
      return route.fulfill({ json: submission })
    }
    if (
      url.pathname.endsWith(`/assessments/submissions/${submissionId}/submit`) &&
      request.method() === 'POST'
    ) {
      submission = buildSubmission({
        status: 'graded',
        score: 1,
        maxScore: 1,
        passed: true,
        questionResults: [{ questionId, correct: true, pointsAwarded: 1, pointsPossible: 1 }],
      })
      return route.fulfill({ json: submission })
    }
    return route.fulfill({ status: 404, json: { message: 'Unhandled E2E request' } })
  })
}

test.beforeEach(async ({ page }) => {
  submission = null
  await mockLearnerApi(page)
})

test('a learner starts a quiz, answers it, and sees a graded result', async ({ page }) => {
  await page.goto(`/assessments/quizzes/${courseId}/${assessmentId}`)

  await expect(page.getByRole('heading', { name: 'Checkpoint quiz' })).toBeVisible()
  await page.getByRole('button', { name: 'Start quiz' }).click()

  await expect(page.getByText('What is 2 + 2?')).toBeVisible()
  await page.getByRole('radio', { name: '4' }).check()
  await page.getByRole('button', { name: 'Submit quiz' }).click()

  await expect(page.getByText('Passed')).toBeVisible()
  await expect(page.getByText(/You scored 1 \/ 1/)).toBeVisible()
})

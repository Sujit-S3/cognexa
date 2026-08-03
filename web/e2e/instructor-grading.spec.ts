import { expect, test, type Page } from '@playwright/test'
import type { SubmissionView } from '../src/services/api'

const courseId = '507f1f77bcf86cd799439011'
const submissionId = '507f1f77bcf86cd799439033'
const criterionId = '507f1f77bcf86cd799439055'

const instructor = {
  id: '507f1f77bcf86cd799439010',
  username: 'maya.instructor',
  name: 'Maya Instructor',
  email: 'maya@cognexa.test',
  photo: '',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  role: 'instructor',
}

let submission: SubmissionView = {
  id: submissionId,
  course: courseId,
  courseAssessmentId: '507f1f77bcf86cd799439022',
  kind: 'assignment',
  student: '507f1f77bcf86cd799439099',
  status: 'submitted',
  attemptNumber: 1,
  text: 'Here is my reflection on the reading.',
  attachments: [],
  rubricScores: [],
  startedAt: new Date().toISOString(),
  submittedAt: new Date().toISOString(),
  assessmentTitleSnapshot: 'Reflection essay',
}

async function mockInstructorApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/session')) return route.fulfill({ json: { hasSession: true } })
    if (url.pathname.endsWith('/auth/refresh')) {
      return route.fulfill({ json: { user: instructor, token: 'e2e-access-token' } })
    }
    if (url.pathname.endsWith(`/instructor/courses/${courseId}/submissions`) && request.method() === 'GET') {
      return route.fulfill({ json: [{ ...submission, student: { name: 'Nora Learner' } }] })
    }
    if (url.pathname.endsWith(`/instructor/courses/${courseId}`) && request.method() === 'GET') {
      return route.fulfill({
        json: {
          _id: courseId,
          name: 'Production AI Systems',
          modules: [],
          assessments: [
            {
              _id: submission.courseAssessmentId,
              kind: 'assignment',
              title: 'Reflection essay',
              order: 0,
              visibility: 'published',
              passingScore: 60,
              rubric: [{ _id: criterionId, title: 'Clarity', points: 10 }],
              attachments: [],
              questions: [],
              randomizeQuestions: false,
              randomizeAnswers: false,
              submissionLimit: 1,
            },
          ],
          status: 'published',
          draftVersion: 1,
        },
      })
    }
    if (
      url.pathname.endsWith(`/instructor/courses/${courseId}/submissions/${submissionId}/grade`) &&
      request.method() === 'POST'
    ) {
      const payload = request.postDataJSON()
      submission = {
        ...submission,
        status: 'graded',
        rubricScores: payload.rubricScores,
        feedback: payload.feedback,
        score: payload.rubricScores.reduce((sum: number, entry: { points: number }) => sum + entry.points, 0),
        maxScore: 10,
        passed: true,
      }
      return route.fulfill({ json: submission })
    }
    return route.fulfill({ status: 404, json: { message: 'Unhandled E2E request' } })
  })
}

test.beforeEach(async ({ page }) => {
  submission = { ...submission, status: 'submitted', rubricScores: [], feedback: undefined }
  await mockInstructorApi(page)
})

test('an instructor reviews and grades a submitted assignment', async ({ page }) => {
  await page.goto(`/instructor/courses/${courseId}/submissions`)

  await expect(page.getByRole('heading', { name: 'Reflection essay' })).toBeVisible()
  await page.getByText('Nora Learner').click()

  await expect(page.getByText('Here is my reflection on the reading.')).toBeVisible()
  await page.getByLabel('Points for Clarity').fill('8')
  await page.getByLabel('Feedback').fill('Great insight, could go deeper.')
  await page.getByRole('button', { name: 'Save grade' }).click()

  await expect.poll(() => submission.status).toBe('graded')
  await expect.poll(() => submission.score).toBe(8)
})

import { expect, test, type Page } from '@playwright/test'
import type { CourseWorkspace } from '../src/services/api'

const courseId = '507f1f77bcf86cd799439011'
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

let workspace: CourseWorkspace = {
  _id: courseId,
  name: 'Untitled course',
  description: '',
  tags: [],
  language: 'English',
  level: 'all-levels',
  prerequisites: [],
  pricing: { model: 'free', amount: 0, currency: 'USD' },
  seo: {},
  modules: [],
  assessments: [],
  status: 'draft',
  draftVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

async function mockInstructorApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/auth/session')) {
      return route.fulfill({ json: { hasSession: true } })
    }
    if (url.pathname.endsWith('/auth/refresh')) {
      return route.fulfill({ json: { user: instructor, token: 'e2e-access-token' } })
    }
    if (url.pathname.endsWith('/instructor/dashboard')) {
      return route.fulfill({
        json: {
          summary: {
            courseCount: 0,
            publishedCourseCount: 0,
            totalStudents: 0,
            pendingSubmissions: 0,
            completionRate: 0,
            revenue: null,
            revenueCurrency: 'USD',
            revenueStatus: 'not_configured',
          },
          courses: [],
          students: [],
          recentActivity: [],
          topCourses: [],
        },
      })
    }
    if (url.pathname.endsWith('/instructor/courses') && request.method() === 'POST') {
      return route.fulfill({ status: 201, json: workspace })
    }
    if (url.pathname.endsWith(`/instructor/courses/${courseId}`) && request.method() === 'GET') {
      return route.fulfill({ json: workspace })
    }
    if (url.pathname.endsWith(`/instructor/courses/${courseId}`) && request.method() === 'PUT') {
      workspace = {
        ...workspace,
        ...request.postDataJSON(),
        draftVersion: workspace.draftVersion + 1,
        updatedAt: new Date().toISOString(),
      }
      return route.fulfill({ json: workspace })
    }
    if (url.pathname.endsWith(`/instructor/courses/${courseId}/status`)) {
      workspace = { ...workspace, status: request.postDataJSON().status }
      return route.fulfill({ json: workspace })
    }
    return route.fulfill({ status: 404, json: { message: 'Unhandled E2E request' } })
  })
}

test.beforeEach(async ({ page }) => {
  workspace = { ...workspace, name: 'Untitled course', modules: [], assessments: [], draftVersion: 1 }
  await mockInstructorApi(page)
})

test('creates a persisted course and builds curriculum entirely through the UI', async ({ page }) => {
  await page.goto('/instructor')
  await page.getByRole('button', { name: 'Create course' }).click()
  await expect(page).toHaveURL(`/instructor/courses/${courseId}/edit`)

  await page.getByLabel('Course title').fill('Production AI Systems')
  await page
    .getByLabel('Description')
    .fill(
      'A complete practical course for designing, operating, and improving reliable production AI systems.'
    )
  await page.getByRole('button', { name: 'Curriculum' }).click()
  await page.getByRole('button', { name: 'Add module' }).click()
  await page.getByLabel('Module 1 title').fill('Architecture foundations')
  await page.getByRole('button', { name: 'Add lesson' }).click()
  await page.getByLabel('Lesson title').fill('Designing dependable AI services')

  await expect.poll(() => workspace.name).toBe('Production AI Systems')
  await expect.poll(() => workspace.modules.length).toBe(1)
  await expect(page.getByText('Saved', { exact: false })).toBeVisible()
})

test('configures a quiz with randomization and question pool settings', async ({ page }) => {
  await page.goto(`/instructor/courses/${courseId}/edit`)
  await page.getByRole('button', { name: 'Assessments' }).click()
  await page.getByRole('button', { name: 'New quiz' }).click()
  await page.getByLabel('Title').fill('Architecture checkpoint')
  await page.getByLabel('Passing score (%)').fill('80')
  await page.getByLabel('Question pool size').fill('1')
  await page.getByText('Randomize questions').click()
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Prompt').fill('Which property supports graceful recovery?')
  await page.getByLabel('Correct answer').fill('Fault isolation')

  await expect.poll(() => workspace.assessments.length).toBe(1)
  await expect.poll(() => workspace.assessments[0]?.passingScore).toBe(80)
})

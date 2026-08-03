import { expect, test, type Page } from '@playwright/test'
import type { CourseView, ModuleItemDetailView } from '../src/services/api'

const courseId = '507f1f77bcf86cd799439011'
const itemId = '507f1f77bcf86cd799439099'
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

let item: ModuleItemDetailView = {
  _id: itemId,
  title: 'Designing dependable AI services',
  type: 'markdown',
  content: '# Welcome\n\nThis lesson covers **reliability** fundamentals.',
  completed: false,
}

function course(): CourseView {
  return {
    _id: courseId,
    name: 'Production AI Systems',
    status: 'published',
    enrolled: true,
    progress: {
      completedCount: item.completed ? 1 : 0,
      totalCount: 1,
      percent: item.completed ? 100 : 0,
      completedItems: item.completed ? [itemId] : [],
    },
    modules: [{ title: 'Architecture foundations', moduleItems: [{ _id: itemId, title: item.title, type: 'markdown' }] }],
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
    if (url.pathname.endsWith(`/courses/${courseId}`) && request.method() === 'GET') {
      return route.fulfill({ json: course() })
    }
    if (url.pathname.endsWith(`/courses/${courseId}/lectures/${itemId}`) && request.method() === 'GET') {
      return route.fulfill({ json: item })
    }
    if (
      url.pathname.endsWith(`/courses/${courseId}/lectures/${itemId}/complete`) &&
      request.method() === 'POST'
    ) {
      item = { ...item, completed: true }
      return route.fulfill({ json: { completedCount: 1, totalCount: 1, percent: 100, completedItems: [itemId] } })
    }
    return route.fulfill({ status: 404, json: { message: 'Unhandled E2E request' } })
  })
}

test.beforeEach(async ({ page }) => {
  item = { ...item, completed: false }
  await mockLearnerApi(page)
})

test('an enrolled learner opens a lesson and marks it complete', async ({ page }) => {
  await page.goto(`/courses/${courseId}/learn/${itemId}`)

  await expect(page.getByRole('heading', { name: item.title })).toBeVisible()
  await expect(page.getByText('reliability')).toBeVisible()

  await page.getByRole('button', { name: 'Mark complete' }).click()

  await expect(page.getByRole('button', { name: 'Completed' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Completed' })).toBeDisabled()
})

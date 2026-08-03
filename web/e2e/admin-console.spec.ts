import { expect, test, type Page } from '@playwright/test'
import type { AdminUserView, AuditLogEntryView } from '../src/services/api'

const admin = {
  id: '507f1f77bcf86cd799439010',
  username: 'root.admin',
  name: 'Root Admin',
  email: 'root@cognexa.test',
  photo: '',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  role: 'admin',
}

const otherUser: AdminUserView = {
  id: '507f1f77bcf86cd799439099',
  username: 'ada',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'student',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
}

let userIsActive = true

const auditEntry: AuditLogEntryView = {
  id: '507f1f77bcf86cd799439077',
  actor: { id: admin.id, name: admin.name, email: admin.email },
  action: 'user.deactivate',
  targetType: 'User',
  targetId: otherUser.id,
  createdAt: new Date().toISOString(),
}

async function mockAdminApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/session')) return route.fulfill({ json: { hasSession: true } })
    if (url.pathname.endsWith('/auth/refresh')) {
      return route.fulfill({ json: { user: admin, token: 'e2e-access-token' } })
    }
    if (url.pathname.endsWith('/admin/users') && request.method() === 'GET') {
      return route.fulfill({
        json: {
          users: [{ ...otherUser, isActive: userIsActive }],
          total: 1,
          page: 1,
          limit: 20,
        },
      })
    }
    if (url.pathname.endsWith(`/admin/users/${otherUser.id}/status`) && request.method() === 'POST') {
      userIsActive = request.postDataJSON().isActive
      return route.fulfill({ json: { ...otherUser, isActive: userIsActive } })
    }
    if (url.pathname.endsWith('/admin/audit-log') && request.method() === 'GET') {
      return route.fulfill({ json: { entries: [auditEntry], total: 1, page: 1, limit: 50 } })
    }
    if (url.pathname.endsWith('/instructor/dashboard') && request.method() === 'GET') {
      return route.fulfill({
        json: {
          summary: {
            courseCount: 1,
            publishedCourseCount: 1,
            totalStudents: 5,
            completionRate: 50,
            pendingSubmissions: 0,
          },
          courses: [
            {
              id: 'course-1',
              name: 'Systems Thinking',
              status: 'published',
              analytics: { studentCount: 5, lessonCount: 6, completionRate: 50 },
            },
          ],
          recentActivity: [],
          topCourses: [],
          students: [],
        },
      })
    }
    return route.fulfill({ status: 404, json: { message: 'Unhandled E2E request' } })
  })
}

test.beforeEach(async ({ page }) => {
  userIsActive = true
  await mockAdminApi(page)
})

test('an admin reviews users, courses, and the audit log', async ({ page }) => {
  await page.goto('/admin')

  await expect(page.getByRole('heading', { name: 'Admin console' })).toBeVisible()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()

  await page.getByRole('button', { name: 'Deactivate' }).click()
  await expect.poll(() => userIsActive).toBe(false)
  await expect(page.getByText('Deactivated')).toBeVisible()

  await page.getByRole('button', { name: 'Courses' }).click()
  await expect(page.getByText('Systems Thinking')).toBeVisible()

  await page.getByRole('button', { name: 'Audit log' }).click()
  await expect(page.getByText('user.deactivate')).toBeVisible()
})

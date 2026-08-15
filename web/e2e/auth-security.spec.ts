import { expect, test, type Page } from '@playwright/test'
import type { UserAttrs } from '../src/services/api'

const student: UserAttrs = {
  id: '507f1f77bcf86cd799439010',
  username: 'nora.learner',
  name: 'Nora Learner',
  email: 'nora@cognexa.test',
  photo: '',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  role: 'student',
  enrollments: [],
}

// Server-side session state for this mock — starts signed-out, flips true on login,
// flips false on logout or when a test simulates the refresh token being revoked elsewhere
// (e.g. an admin deactivating the account, or an expired/rotated session).
let hasSession = false

async function mockAuthApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/session')) {
      return route.fulfill({ json: { hasSession } })
    }
    if (url.pathname.endsWith('/auth/refresh') && request.method() === 'POST') {
      if (!hasSession) return route.fulfill({ status: 401, json: { error: 'Session expired' } })
      return route.fulfill({ json: { user: student, token: 'e2e-access-token' } })
    }
    if (url.pathname.endsWith('/auth/login') && request.method() === 'POST') {
      hasSession = true
      return route.fulfill({ status: 200, json: { user: student, token: 'e2e-access-token' } })
    }
    if (url.pathname.endsWith('/auth/logout') && request.method() === 'POST') {
      hasSession = false
      return route.fulfill({ json: { message: 'Logged out' } })
    }
    if (url.pathname.endsWith('/courses') && request.method() === 'GET') {
      return route.fulfill({ json: [] })
    }
    if (url.pathname.endsWith('/deadlines') && request.method() === 'GET') {
      return route.fulfill({ json: [] })
    }
    if (url.pathname.endsWith('/certificates/mine') && request.method() === 'GET') {
      return route.fulfill({ json: [] })
    }
    return route.fulfill({ status: 404, json: { message: 'Unhandled E2E request' } })
  })
}

test.beforeEach(async ({ page }) => {
  hasSession = false
  await mockAuthApi(page)
})

test('an unauthenticated visitor hitting a protected route is redirected to sign in', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
})

test('logging in reaches the dashboard, and logging out returns to a signed-out state', async ({ page }) => {
  await page.goto('/auth/login')
  await page.getByPlaceholder('you@example.com').fill(student.email)
  await page.getByPlaceholder('••••••••••••').fill('correct horse battery staple')
  await page.getByRole('button', { name: /Sign In/ }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: `Welcome back, ${student.name}` })).toBeVisible()

  await page.getByTitle('Sign out').click()

  // Logout lands on the public landing page, not the login form directly.
  await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:\d+\/$/)

  // The signed-out state must actually be enforced server-side too, not just client-routing —
  // going straight back to the protected route after logout must bounce to login again rather
  // than trusting stale client state.
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/auth\/login/)
})

test('a session revoked elsewhere (e.g. deactivated account) is not trusted on next load', async ({
  page,
}) => {
  // Log in normally first, establishing client-side authenticated state...
  await page.goto('/auth/login')
  await page.getByPlaceholder('you@example.com').fill(student.email)
  await page.getByPlaceholder('••••••••••••').fill('correct horse battery staple')
  await page.getByRole('button', { name: /Sign In/ }).click()
  await expect(page).toHaveURL(/\/dashboard/)

  // ...then simulate the session being invalidated server-side without the client knowing
  // (matches Server/src/models/user.model.ts#findByCredentials / authenticate() re-checking
  // isActive on every request — a revoked account must not stay usable from stale local state).
  hasSession = false

  await page.reload()
  await expect(page).toHaveURL(/\/auth\/login/)
})

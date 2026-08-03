import { expect, test, type Page } from '@playwright/test'
import type { InvitationView, MemberProgressView, OrganizationView } from '../src/services/api'

const orgId = '507f1f77bcf86cd799439011'
const owner = {
  id: '507f1f77bcf86cd799439010',
  username: 'owner',
  name: 'Owner Person',
  email: 'owner@cognexa.test',
  photo: '',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  role: 'instructor',
}
const member = {
  id: '507f1f77bcf86cd799439099',
  username: 'invitee',
  name: 'Invitee Person',
  email: 'invitee@cognexa.test',
  photo: '',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
  role: 'student',
}

let org: OrganizationView = {
  id: orgId,
  name: 'Acme University',
  slug: 'acme-university',
  createdBy: owner.id,
  members: [{ id: 'm-1', role: 'owner', joinedAt: new Date().toISOString(), user: owner }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

let invitations: InvitationView[] = []

async function mockCommon(page: Page, sessionUser: typeof owner | typeof member) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname.endsWith('/auth/session')) return route.fulfill({ json: { hasSession: true } })
    if (url.pathname.endsWith('/auth/refresh')) {
      return route.fulfill({ json: { user: sessionUser, token: 'e2e-access-token' } })
    }
    if (url.pathname === `/api/v1/organizations/${orgId}` && request.method() === 'GET') {
      return route.fulfill({ json: org })
    }
    if (url.pathname === `/api/v1/organizations/${orgId}/invitations` && request.method() === 'GET') {
      return route.fulfill({ json: invitations })
    }
    if (url.pathname === `/api/v1/organizations/${orgId}/invitations` && request.method() === 'POST') {
      const payload = request.postDataJSON()
      const invitation: InvitationView = {
        id: 'inv-1',
        organization: orgId,
        email: payload.email,
        role: payload.role,
        status: 'pending',
        invitedBy: owner.id,
        expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        createdAt: new Date().toISOString(),
      }
      invitations = [invitation]
      return route.fulfill({ status: 201, json: invitation })
    }
    if (url.pathname === `/api/v1/organizations/${orgId}/assign-learning` && request.method() === 'POST') {
      return route.fulfill({ status: 201, json: request.postDataJSON() })
    }
    if (url.pathname === `/api/v1/organizations/${orgId}/progress` && request.method() === 'GET') {
      const progress: MemberProgressView[] = [
        {
          userId: member.id,
          name: member.name,
          email: member.email,
          certificatesEarned: 0,
          courses: [
            {
              courseId: 'course-1',
              courseName: 'Systems Thinking',
              progress: { completedCount: 1, totalCount: 4, percent: 25, completedItems: [] },
            },
          ],
        },
      ]
      return route.fulfill({ json: progress })
    }
    if (url.pathname === `/api/v1/organizations/${orgId}/audit-log` && request.method() === 'GET') {
      return route.fulfill({ json: [] })
    }
    if (url.pathname === '/api/v1/courses' && request.method() === 'GET') {
      return route.fulfill({
        json: [{ _id: 'course-1', name: 'Systems Thinking', status: 'published' }],
      })
    }
    if (url.pathname.startsWith('/api/v1/invitations/') && url.pathname.endsWith('/accept')) {
      org = {
        ...org,
        members: [
          ...org.members,
          { id: 'm-2', role: 'member', joinedAt: new Date().toISOString(), user: member },
        ],
      }
      return route.fulfill({ json: org })
    }
    if (url.pathname === '/api/v1/invitations/valid-token' && request.method() === 'GET') {
      return route.fulfill({
        json: {
          id: 'inv-1',
          organization: { id: orgId, name: org.name },
          email: member.email,
          role: 'member',
          status: 'pending',
        },
      })
    }
    return route.fulfill({ status: 404, json: { message: 'Unhandled E2E request' } })
  })
}

test.beforeEach(() => {
  org = {
    id: orgId,
    name: 'Acme University',
    slug: 'acme-university',
    createdBy: owner.id,
    members: [{ id: 'm-1', role: 'owner', joinedAt: new Date().toISOString(), user: owner }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  invitations = []
})

test('an owner invites a member, assigns learning, and reviews progress', async ({ page }) => {
  await mockCommon(page, owner)
  await page.goto(`/organizations/${orgId}`)

  await expect(page.getByRole('heading', { name: 'Acme University' })).toBeVisible()

  await page.getByRole('button', { name: 'Invitations' }).click()
  await page.getByLabel('Invite email').fill(member.email)
  await page.getByRole('button', { name: 'Send invitation' }).click()
  await expect(page.getByText(member.email)).toBeVisible()

  await page.getByRole('button', { name: 'Assign learning' }).click()
  // The invited member hasn't accepted yet in this mock, so assign to the seeded owner member
  // to exercise the flow end-to-end without needing a second authenticated session mid-test.
  await page.getByLabel('Member').selectOption({ label: owner.name })
  await page.getByLabel('Course').selectOption({ label: 'Systems Thinking' })
  await page.getByRole('button', { name: 'Assign course' }).click()
  await expect(page.getByText('Course assigned.')).toBeVisible()

  await page.getByRole('button', { name: 'Progress' }).click()
  await expect(page.getByText('Systems Thinking')).toBeVisible()
  await expect(page.getByText('25%')).toBeVisible()
})

test('an invitee accepts an invitation and lands in the organization', async ({ page }) => {
  await mockCommon(page, member)
  await page.goto('/invitations/valid-token')

  await expect(page.getByRole('heading', { name: 'Join Acme University' })).toBeVisible()
  await page.getByRole('button', { name: 'Accept invitation' }).click()

  await expect(page).toHaveURL(new RegExp(`/organizations/${orgId}$`))
})

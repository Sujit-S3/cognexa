import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { InvitationView, MemberProgressView, OrganizationView } from '../../services/api'

const mocks = vi.hoisted(() => ({
  getOne: vi.fn(),
  listInvitations: vi.fn(),
  inviteMember: vi.fn(),
  revokeInvitation: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  assignLearning: vi.fn(),
  getMembersProgress: vi.fn(),
  getAuditLog: vi.fn(),
  getAllCourses: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  organizationsApi: {
    getOne: mocks.getOne,
    listInvitations: mocks.listInvitations,
    inviteMember: mocks.inviteMember,
    revokeInvitation: mocks.revokeInvitation,
    updateMemberRole: mocks.updateMemberRole,
    removeMember: mocks.removeMember,
    assignLearning: mocks.assignLearning,
    getMembersProgress: mocks.getMembersProgress,
    getAuditLog: mocks.getAuditLog,
  },
  coursesApi: { getAll: mocks.getAllCourses },
}))

import { OrganizationDetailPage } from './OrganizationDetailPage'
import { useAuthStore } from '../../stores/authStore'

const org: OrganizationView = {
  id: 'org-1',
  name: 'Acme University',
  slug: 'acme-university',
  createdBy: 'owner-1',
  members: [
    {
      id: 'm-1',
      role: 'owner',
      joinedAt: new Date().toISOString(),
      user: { id: 'owner-1', name: 'Owner Person', email: 'owner@example.com', photo: '' },
    },
    {
      id: 'm-2',
      role: 'member',
      joinedAt: new Date().toISOString(),
      user: { id: 'member-1', name: 'Member Person', email: 'member@example.com', photo: '' },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const invitation: InvitationView = {
  id: 'inv-1',
  organization: org.id,
  email: 'pending@example.com',
  role: 'member',
  status: 'pending',
  invitedBy: 'owner-1',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  createdAt: new Date().toISOString(),
}

const progress: MemberProgressView[] = [
  {
    userId: 'member-1',
    name: 'Member Person',
    email: 'member@example.com',
    certificatesEarned: 1,
    courses: [
      {
        courseId: 'course-1',
        courseName: 'Systems Thinking',
        progress: { completedCount: 2, totalCount: 4, percent: 50, completedItems: [] },
      },
    ],
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/organizations/org-1']}>
        <Routes>
          <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OrganizationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        id: 'owner-1',
        username: 'owner',
        name: 'Owner Person',
        email: 'owner@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'instructor',
      },
    })
    mocks.getOne.mockResolvedValue(org)
    mocks.listInvitations.mockResolvedValue([invitation])
    mocks.getMembersProgress.mockResolvedValue(progress)
    mocks.getAuditLog.mockResolvedValue([])
    mocks.getAllCourses.mockResolvedValue([{ id: 'course-1', name: 'Systems Thinking', status: 'published' }])
  })

  it('shows the member roster and lets an owner remove a member', async () => {
    mocks.removeMember.mockResolvedValue(undefined)
    renderPage()

    const memberName = await screen.findByText('Member Person')
    const memberRow = memberName.closest('tr')!
    fireEvent.click(within(memberRow).getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(mocks.removeMember).toHaveBeenCalledWith('org-1', 'member-1'))
  })

  it('sends an invitation from the invitations tab', async () => {
    mocks.inviteMember.mockResolvedValue(invitation)
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Invitations' }))
    fireEvent.change(screen.getByLabelText('Invite email'), { target: { value: 'new@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => expect(mocks.inviteMember).toHaveBeenCalledWith('org-1', 'new@example.com', 'member'))
  })

  it('assigns a published course to a member', async () => {
    mocks.assignLearning.mockResolvedValue({ userId: 'member-1', courseId: 'course-1' })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Assign learning' }))
    fireEvent.change(await screen.findByLabelText('Member'), { target: { value: 'member-1' } })
    fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'course-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Assign course' }))

    await waitFor(() => expect(mocks.assignLearning).toHaveBeenCalledWith('org-1', 'member-1', 'course-1'))
  })

  it('shows per-member progress', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Progress' }))
    expect(await screen.findByText('Systems Thinking')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
})

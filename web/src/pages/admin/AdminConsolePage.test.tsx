import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AdminUserView, AuditLogEntryView, InstructorDashboardView } from '../../services/api'

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  updateUserStatus: vi.fn(),
  updateUserRole: vi.fn(),
  getAuditLog: vi.fn(),
  getDashboard: vi.fn(),
  transitionStatus: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  adminApi: {
    listUsers: mocks.listUsers,
    updateUserStatus: mocks.updateUserStatus,
    updateUserRole: mocks.updateUserRole,
    getAuditLog: mocks.getAuditLog,
  },
  instructorApi: {
    getDashboard: mocks.getDashboard,
    transitionStatus: mocks.transitionStatus,
  },
}))

import { AdminConsolePage } from './AdminConsolePage'
import { useAuthStore } from '../../stores/authStore'

const selfUser: AdminUserView = {
  id: 'admin-self',
  username: 'admin-self',
  name: 'Self Admin',
  email: 'self@example.com',
  role: 'admin',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
}

const otherUser: AdminUserView = {
  id: 'user-2',
  username: 'ada',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'student',
  isActive: true,
  lastSeenAt: new Date().toISOString(),
}

const auditEntry: AuditLogEntryView = {
  id: 'evt-1',
  actor: { id: 'admin-self', name: 'Self Admin', email: 'self@example.com' },
  action: 'user.deactivate',
  targetType: 'User',
  targetId: 'user-2',
  createdAt: new Date().toISOString(),
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminConsolePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminConsolePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: {
        id: 'admin-self',
        username: 'admin-self',
        name: 'Self Admin',
        email: 'self@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'admin',
      },
    })
    mocks.listUsers.mockResolvedValue({ users: [selfUser, otherUser], total: 2, page: 1, limit: 20 })
    mocks.getAuditLog.mockResolvedValue({ entries: [auditEntry], total: 1, page: 1, limit: 50 })
    mocks.getDashboard.mockResolvedValue({
      summary: {
        courseCount: 1,
        publishedCourseCount: 1,
        totalStudents: 3,
        completionRate: 40,
        pendingSubmissions: 0,
      },
      courses: [
        {
          id: 'course-1',
          name: 'Systems Thinking',
          status: 'published',
          analytics: { studentCount: 3, lessonCount: 5, completionRate: 40 },
        },
      ],
      recentActivity: [],
      topCourses: [],
      students: [],
    } as unknown as InstructorDashboardView)
  })

  it('lists users and disables self-targeting controls', async () => {
    renderPage()

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    const selfRow = rows.find((row) => row.textContent?.includes('Self Admin'))!
    const deactivateButton = within(selfRow).getByRole('button', { name: /Deactivate/ })
    expect(deactivateButton).toBeDisabled()
  })

  it('deactivates another user', async () => {
    mocks.updateUserStatus.mockResolvedValue({ ...otherUser, isActive: false })
    renderPage()

    await screen.findByText('Ada Lovelace')
    const rows = screen.getAllByRole('row')
    const otherRow = rows.find((row) => row.textContent?.includes('Ada Lovelace'))!
    fireEvent.click(within(otherRow).getByRole('button', { name: /Deactivate/ }))

    await waitFor(() => expect(mocks.updateUserStatus).toHaveBeenCalledWith('user-2', false))
  })

  it('switches to the courses tab and shows platform courses', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Courses' }))
    expect(await screen.findByText('Systems Thinking')).toBeInTheDocument()
  })

  it('switches to the audit log tab and shows platform events', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Audit log' }))
    expect(await screen.findByText('user.deactivate')).toBeInTheDocument()
  })
})

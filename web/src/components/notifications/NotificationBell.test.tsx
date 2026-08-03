import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { NotificationView } from '../../services/api'

const mocks = vi.hoisted(() => ({
  getUnreadCount: vi.fn(),
  getAll: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  notificationsApi: {
    getUnreadCount: mocks.getUnreadCount,
    getAll: mocks.getAll,
    markAsRead: mocks.markAsRead,
    markAllAsRead: mocks.markAllAsRead,
  },
}))

import { NotificationBell } from './NotificationBell'

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const sample: NotificationView = {
  id: 'n1',
  type: 'certificate_issued',
  // Title deliberately distinct from the "Certificate earned" type-label text the panel also
  // renders, so text queries below aren't ambiguous between the two.
  title: 'Systems Thinking complete',
  body: 'You completed Systems Thinking',
  link: '/certificates/verify/CGX-ABC',
  read: false,
  createdAt: new Date().toISOString(),
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAll.mockResolvedValue([sample])
  })

  it('shows an unread count badge', async () => {
    mocks.getUnreadCount.mockResolvedValue(2)
    renderBell()

    expect(await screen.findByText('2')).toBeInTheDocument()
  })

  it('opens the panel and lists notifications on click', async () => {
    mocks.getUnreadCount.mockResolvedValue(1)
    renderBell()

    fireEvent.click(await screen.findByRole('button', { name: /Notifications/ }))

    expect(await screen.findByText('Systems Thinking complete')).toBeInTheDocument()
    expect(screen.getByText('You completed Systems Thinking')).toBeInTheDocument()
    expect(screen.getByText('Certificate earned')).toBeInTheDocument()
  })

  it('marks all as read', async () => {
    mocks.getUnreadCount.mockResolvedValue(1)
    mocks.markAllAsRead.mockResolvedValue(undefined)
    renderBell()

    fireEvent.click(await screen.findByRole('button', { name: /Notifications/ }))
    await screen.findByText('Systems Thinking complete')
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))

    await waitFor(() => expect(mocks.markAllAsRead).toHaveBeenCalled())
  })
})

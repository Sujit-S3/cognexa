import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { InvitationPreviewView, OrganizationView } from '../../services/api'

const mocks = vi.hoisted(() => ({
  getByToken: vi.fn(),
  accept: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  invitationsApi: { getByToken: mocks.getByToken, accept: mocks.accept },
}))

import { InvitationAcceptPage } from './InvitationAcceptPage'
import { useAuthStore } from '../../stores/authStore'

const preview: InvitationPreviewView = {
  id: 'inv-1',
  organization: { id: 'org-1', name: 'Acme University' },
  email: 'invitee@example.com',
  role: 'member',
  status: 'pending',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/invitations/tok123']}>
        <Routes>
          <Route path="/invitations/:token" element={<InvitationAcceptPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InvitationAcceptPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('shows a sign-in prompt when signed out', async () => {
    mocks.getByToken.mockResolvedValue(preview)
    renderPage()

    expect(await screen.findByText('Join Acme University')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in to accept' })).toBeInTheDocument()
  })

  it('warns when the signed-in email does not match the invitation', async () => {
    mocks.getByToken.mockResolvedValue(preview)
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'u2',
        username: 'other',
        name: 'Other Person',
        email: 'other@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'student',
      },
    })
    renderPage()

    expect(await screen.findByText(/Sign in with invitee@example.com/)).toBeInTheDocument()
  })

  it('accepts the invitation when the signed-in email matches', async () => {
    mocks.getByToken.mockResolvedValue(preview)
    mocks.accept.mockResolvedValue({ id: 'org-1' } as OrganizationView)
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'u1',
        username: 'invitee',
        name: 'Invitee Person',
        email: 'invitee@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'student',
      },
    })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledWith('tok123'))
  })

  it('shows that a non-pending invitation can no longer be accepted', async () => {
    mocks.getByToken.mockResolvedValue({ ...preview, status: 'expired' })
    renderPage()

    expect(await screen.findByText(/This invitation is expired/)).toBeInTheDocument()
  })
})

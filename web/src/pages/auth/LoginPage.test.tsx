import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AuthResponse } from '../../services/api'

const mocks = vi.hoisted(() => ({ login: vi.fn() }))

vi.mock('../../services/api', () => ({
  authApi: { login: mocks.login },
  setAccessToken: vi.fn(),
}))

import { LoginPage } from './LoginPage'
import { useAuthStore } from '../../stores/authStore'

function renderAt(initialPath: string, initialState?: unknown) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: initialPath, state: initialState }]}>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Student dashboard</div>} />
          <Route path="/instructor" element={<div>Instructor workspace</div>} />
          <Route path="/organizations/:orgId" element={<div>Organization workspace</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

async function submit() {
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'nora@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
  fireEvent.click(screen.getByRole('button', { name: /Sign In/ }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })

  it('redirects a student to /dashboard by default', async () => {
    mocks.login.mockResolvedValue({
      user: {
        id: 'u1',
        username: 'nora',
        name: 'Nora',
        email: 'nora@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'student',
      },
      token: 'tok',
    } satisfies AuthResponse)
    renderAt('/auth/login')

    await submit()
    await waitFor(() => expect(screen.getByText('Student dashboard')).toBeInTheDocument())
  })

  it('redirects an instructor to /instructor by default', async () => {
    mocks.login.mockResolvedValue({
      user: {
        id: 'u1',
        username: 'ivan',
        name: 'Ivan',
        email: 'ivan@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'instructor',
      },
      token: 'tok',
    } satisfies AuthResponse)
    renderAt('/auth/login')

    await submit()
    await waitFor(() => expect(screen.getByText('Instructor workspace')).toBeInTheDocument())
  })

  it('redirects back to the originally requested page when state.from is present', async () => {
    mocks.login.mockResolvedValue({
      user: {
        id: 'u1',
        username: 'nora',
        name: 'Nora',
        email: 'nora@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'student',
      },
      token: 'tok',
    } satisfies AuthResponse)
    renderAt('/auth/login', { from: { pathname: '/organizations/org-1', search: '', hash: '' } })

    await submit()
    await waitFor(() => expect(screen.getByText('Organization workspace')).toBeInTheDocument())
  })
})

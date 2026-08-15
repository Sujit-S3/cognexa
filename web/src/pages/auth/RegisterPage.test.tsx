import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AuthResponse } from '../../services/api'

const mocks = vi.hoisted(() => ({ register: vi.fn() }))

vi.mock('../../services/api', () => ({
  authApi: { register: mocks.register },
  setAccessToken: vi.fn(),
}))

import { RegisterPage } from './RegisterPage'
import { useAuthStore } from '../../stores/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/auth/register']}>
        <Routes>
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<div>Student dashboard</div>} />
          <Route path="/instructor" element={<div>Instructor workspace</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function fillCommonFields() {
  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Ivan Instructor' } })
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ivan_i' } })
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'ivan@example.com' } })
  fireEvent.change(screen.getByLabelText('Mobile Number'), { target: { value: '555-010-1234' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
  fireEvent.change(screen.getByLabelText('Confirm'), { target: { value: 'correct horse battery staple' } })
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })

  it('redirects a new student to /dashboard', async () => {
    mocks.register.mockResolvedValue({
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
    renderPage()

    fillCommonFields()
    fireEvent.click(screen.getByRole('button', { name: /Create Account/ }))

    await waitFor(() => expect(screen.getByText('Student dashboard')).toBeInTheDocument())
  })

  it('redirects a new instructor to /instructor, not the student dashboard', async () => {
    mocks.register.mockResolvedValue({
      user: {
        id: 'u1',
        username: 'ivan_i',
        name: 'Ivan Instructor',
        email: 'ivan@example.com',
        photo: '',
        isActive: true,
        lastSeenAt: new Date(),
        role: 'instructor',
      },
      token: 'tok',
    } satisfies AuthResponse)
    renderPage()

    fireEvent.click(screen.getByText('Instructor'))
    fillCommonFields()
    fireEvent.click(screen.getByRole('button', { name: /Create Account/ }))

    await waitFor(() => expect(screen.getByText('Instructor workspace')).toBeInTheDocument())
  })
})

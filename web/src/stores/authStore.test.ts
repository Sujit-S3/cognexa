import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sessionStatus: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  setAccessToken: vi.fn(),
}))

vi.mock('../services/api', () => ({
  authApi: { sessionStatus: mocks.sessionStatus, refresh: mocks.refresh, logout: mocks.logout },
  setAccessToken: mocks.setAccessToken,
}))

import { useAuthStore } from './authStore'

const user = {
  id: 'user-1',
  username: 'learner',
  name: 'Nora Learner',
  email: 'nora@example.com',
  photo: '',
  isActive: true,
  lastSeenAt: new Date(),
  role: 'student' as const,
}

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: true, error: null })
  })

  it('restores a server-managed session without browser token storage', async () => {
    mocks.sessionStatus.mockResolvedValue({ hasSession: true })
    mocks.refresh.mockResolvedValue({ user, token: 'short-lived-access' })

    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState()).toMatchObject({ user, isAuthenticated: true, isLoading: false })
    expect(localStorage.getItem('cognexa_token')).toBeNull()
  })

  it('settles as anonymous when no refresh session exists', async () => {
    mocks.sessionStatus.mockResolvedValue({ hasSession: false })

    await useAuthStore.getState().initialize()

    expect(useAuthStore.getState()).toMatchObject({ user: null, isAuthenticated: false, isLoading: false })
    expect(mocks.setAccessToken).toHaveBeenCalledWith(null)
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})

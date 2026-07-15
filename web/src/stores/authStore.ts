import { create } from 'zustand'
import { authApi, type UserAttrs } from '../services/api'

interface AuthState {
  user: UserAttrs | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (user: UserAttrs, token: string) => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
  updateUser: (user: UserAttrs) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('nexus_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })(),
  token: localStorage.getItem('nexus_token'),
  isAuthenticated: Boolean(localStorage.getItem('nexus_token')),
  isLoading: true,
  error: null,

  login: (user: UserAttrs, token: string) => {
    localStorage.setItem('nexus_token', token)
    localStorage.setItem('nexus_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true, error: null, isLoading: false })
  },

  logout: async () => {
    try {
      if (get().token) {
        await authApi.logout()
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('nexus_token')
      localStorage.removeItem('nexus_user')
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('nexus_token')
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      return
    }

    set({ isLoading: true })
    try {
      const user = await authApi.getMe()
      localStorage.setItem('nexus_user', JSON.stringify(user))
      set({ user, token, isAuthenticated: true, isLoading: false, error: null })
    } catch (err: unknown) {
      localStorage.removeItem('nexus_token')
      localStorage.removeItem('nexus_user')
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Session expired',
      })
    }
  },

  updateUser: (user: UserAttrs) => {
    localStorage.setItem('nexus_user', JSON.stringify(user))
    set({ user })
  },
}))

// Listen for unauthorized events emitted by api.ts interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('nexus:unauthorized', () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })
}

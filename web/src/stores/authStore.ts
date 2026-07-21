import { create } from 'zustand'
import { authApi, setAccessToken, type UserAttrs } from '../services/api'

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
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: (user: UserAttrs, token: string) => {
    setAccessToken(token)
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
      setAccessToken(null)
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const status = await authApi.sessionStatus()
      if (!status.hasSession) {
        setAccessToken(null)
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
        return
      }
      const session = await authApi.refresh()
      set({
        user: session.user,
        token: session.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err: unknown) {
      setAccessToken(null)
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
    set({ user })
  },
}))

// Listen for unauthorized events emitted by api.ts interceptor
if (typeof window !== 'undefined') {
  window.addEventListener('cognexa:unauthorized', () => {
    setAccessToken(null)
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  })
}

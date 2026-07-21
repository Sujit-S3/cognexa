import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface RequireAuthProps {
  children: ReactNode
  allowedRoles?: Array<'student' | 'instructor' | 'admin'>
}

/**
 * RequireAuth — wraps any route that demands an active session.
 * - If not authenticated → redirect to /auth/login (preserving intended destination).
 * - If role not permitted → redirect to role-appropriate dashboard.
 */
export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore()
  const location = useLocation()

  // Still hydrating from localStorage
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--nx-bg)',
          color: 'var(--nx-fg-muted)',
        }}
      >
        Initializing session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'admin' ? '/admin' : user.role === 'instructor' ? '/instructor' : '/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}

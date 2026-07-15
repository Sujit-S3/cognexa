import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Button } from '../../design'

interface RequireAuthProps {
  children: ReactNode
  allowedRoles?: Array<'admin' | 'student' | 'instructor'>
}

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <GlassCard elevation="raised" style={{ padding: '32px', textAlign: 'center' }}>
          <div className="nx-gradient-text" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
            Checking Session...
          </div>
          <p style={{ color: 'var(--nx-fg-muted)', fontSize: '0.9rem' }}>
            Verifying secure access credentials with NEXUS AI.
          </p>
        </GlassCard>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: '24px' }}>
        <GlassCard elevation="raised" glow style={{ padding: '40px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
            Access Restricted
          </h2>
          <p style={{ color: 'var(--nx-fg-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
            Your account is currently registered with the role <strong>{user.role.toUpperCase()}</strong>, which does not
            grant permission to view this section.
          </p>
          <Button magnetic onClick={() => window.history.back()}>
            Go Back
          </Button>
        </GlassCard>
      </div>
    )
  }

  return <>{children}</>
}

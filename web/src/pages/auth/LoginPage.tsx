import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.login({ email, password })
      login(res.user, res.token)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      badgeText="Welcome Back"
      badgeTone="brand"
      title="Access NEXUS AI"
      subtitle="Sign in to resume your gamified AI learning journey"
      footerText="Don't have an account yet?"
      footerLinkText="Claim your Pro Pass"
      footerLinkTo="/auth/register"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            ⚠️ {error}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Email Address</label>
          <div className={styles.inputWrap}>
            <input
              type="email"
              required
              className={styles.input}
              placeholder="student@nexus.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className={styles.label}>Password</label>
            <Link to="/auth/forgot" className={styles.link} style={{ fontSize: '0.8rem' }}>
              Forgot password?
            </Link>
          </div>
          <div className={styles.inputWrap}>
            <input
              type="password"
              required
              className={styles.input}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <Button
            magnetic
            glow
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard 🚀'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}

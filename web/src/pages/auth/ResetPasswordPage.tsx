import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setVerifying(false)
      return
    }
    authApi
      .verifyResetToken(token)
      .then((res) => {
        setTokenValid(res.valid)
      })
      .catch(() => {
        setTokenValid(false)
      })
      .finally(() => {
        setVerifying(false)
      })
  }, [token])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!token) return
    if (password !== passwordConfirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.resetPassword(token, { password, passwordConfirm })
      setMessage(res.message || 'Password updated successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/auth/login', { replace: true })
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <AuthLayout title="Verifying Token..." subtitle="Checking security credentials" badgeText="Security Check">
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--nx-fg-muted)' }}>
          Please wait while we validate your recovery link...
        </div>
      </AuthLayout>
    )
  }

  if (!tokenValid) {
    return (
      <AuthLayout
        badgeText="Link Expired"
        badgeTone="pink"
        title="Invalid Recovery Link"
        subtitle="This password reset token is invalid or has expired."
        footerText="Need a new recovery link?"
        footerLinkText="Request password reset"
        footerLinkTo="/auth/forgot"
      >
        <div style={{ textAlign: 'center', padding: '16px' }}>
          <Button magnetic glow onClick={() => navigate('/auth/forgot')}>
            Request New Reset Link
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      badgeText="Secure Reset"
      badgeTone="success"
      title="Create New Password"
      subtitle="Enter and confirm your new account password below"
      footerText="Remembered your password?"
      footerLinkText="Sign in now"
      footerLinkTo="/auth/login"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            ⚠️ {error}
          </div>
        )}
        {message && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            ✅ {message}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>New Password</label>
          <input
            type="password"
            required
            className={styles.input}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Confirm New Password</label>
          <input
            type="password"
            required
            className={styles.input}
            placeholder="••••••••••••"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </div>

        <div style={{ marginTop: '8px' }}>
          <Button
            magnetic
            glow
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {loading ? 'Updating Password...' : 'Save New Password & Sign In 🔐'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}

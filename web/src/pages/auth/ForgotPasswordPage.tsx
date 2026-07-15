import { useState, type FormEvent } from 'react'
import { authApi } from '../../services/api'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email) {
      setError('Please enter your registered email address.')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.recoverPassword(email)
      setMessage(res.message || 'If that email exists, a password reset link has been sent.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to process request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      badgeText="Account Recovery"
      badgeTone="cyan"
      title="Forgot Password?"
      subtitle="Enter your email address and we'll send a secure reset link"
      footerText="Remembered your credentials?"
      footerLinkText="Back to sign in"
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
          <label className={styles.label}>Registered Email</label>
          <input
            type="email"
            required
            className={styles.input}
            placeholder="student@nexus.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {loading ? 'Sending Request...' : 'Send Recovery Link 📨'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}

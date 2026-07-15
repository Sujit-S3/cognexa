import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('555-019-2834')
  const [role, setRole] = useState<'student' | 'instructor'>('student')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username || !name || !email || !password || !passwordConfirm) {
      setError('All fields are required to register.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.register({
        username,
        name,
        email,
        password,
        passwordConfirm,
        mobile,
        role,
      })
      login(res.user, res.token)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      badgeText="Season 1 Enrollment"
      badgeTone="pink"
      title="Create Pro Account"
      subtitle="Join 42,000+ creators building AI & Web 3D applications"
      footerText="Already enrolled?"
      footerLinkText="Sign in to your account"
      footerLinkTo="/auth/login"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              required
              className={styles.input}
              placeholder="Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              required
              className={styles.input}
              placeholder="alex_ai"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email Address</label>
          <input
            type="email"
            required
            className={styles.input}
            placeholder="alex@nexus.ai"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className={styles.field}>
            <label className={styles.label}>Account Role</label>
            <select
              className={styles.input}
              value={role}
              onChange={(e) => setRole(e.target.value as 'student' | 'instructor')}
              style={{ cursor: 'pointer' }}
            >
              <option value="student" style={{ background: '#0f172a' }}>🎓 Student</option>
              <option value="instructor" style={{ background: '#0f172a' }}>👨‍🏫 Instructor</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Mobile Number</label>
            <input
              type="text"
              required
              className={styles.input}
              placeholder="555-019-2834"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirm</label>
            <input
              type="password"
              required
              className={styles.input}
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <Button
            magnetic
            glow
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {loading ? 'Creating Account...' : 'Enroll Now & Unlock AI Tools ⚡'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  )
}

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.login(values),
    onSuccess: (data) => {
      login(data.user, data.token)
      const role = data.user.role
      navigate(role === 'admin' ? '/admin' : role === 'instructor' ? '/instructor' : '/dashboard', { replace: true })
    },
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your NEXUS AI account to continue learning"
      badgeText="Secure Sign In"
      footerText="Don't have an account?"
      footerLinkText="Create one free"
      footerLinkTo="/auth/register"
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {mutation.isError && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            ⚠️ {mutation.error instanceof Error ? mutation.error.message : 'Sign in failed'}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && <span className={styles.fieldError}>⚠ {errors.email.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            <span>Password</span>
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
            placeholder="••••••••••••"
            {...register('password')}
          />
          {errors.password && <span className={styles.fieldError}>⚠ {errors.password.message}</span>}
          <div style={{ textAlign: 'right', marginTop: '2px' }}>
            <Link to="/auth/forgot" style={{ fontSize: '0.82rem', color: 'var(--nx-brand-400)', textDecoration: 'none', fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          magnetic
          glow
          type="submit"
          disabled={mutation.isPending}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '4px' }}
        >
          {mutation.isPending ? 'Signing in...' : 'Sign In ⚡'}
        </Button>
      </form>
    </AuthLayout>
  )
}

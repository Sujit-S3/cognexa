import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

const schema = z
  .object({
    role: z.enum(['student', 'instructor']),
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores'),
    email: z.string().email('Enter a valid email address'),
    mobile: z.string().min(7, 'Enter a valid mobile number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  })

type FormValues = z.infer<typeof schema>

function passwordStrength(pw: string): { label: string; pct: number; color: string } {
  if (!pw) return { label: '', pct: 0, color: 'transparent' }
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw)].filter(Boolean).length
  if (score <= 1) return { label: 'Weak', pct: 25, color: '#f43f5e' }
  if (score === 2) return { label: 'Fair', pct: 50, color: '#fb923c' }
  if (score === 3) return { label: 'Good', pct: 75, color: '#facc15' }
  return { label: 'Strong', pct: 100, color: '#34d399' }
}

export function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [selectedRole, setSelectedRole] = useState<'student' | 'instructor'>('student')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  })

  const password = watch('password', '')
  const strength = passwordStrength(password)

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.register(values),
    onSuccess: (data) => {
      login(data.user, data.token)
      navigate('/dashboard', { replace: true })
    },
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  const handleRoleSelect = (role: 'student' | 'instructor') => {
    setSelectedRole(role)
    setValue('role', role)
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join thousands of learners on NEXUS AI"
      badgeText="Free Registration"
      badgeTone="success"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkTo="/auth/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {mutation.isError && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            ⚠️ {mutation.error instanceof Error ? mutation.error.message : 'Registration failed'}
          </div>
        )}

        {/* Role selector */}
        <div className={styles.field}>
          <label className={styles.label}>I am joining as</label>
          <div className={styles.roleGrid}>
            <button
              type="button"
              className={`${styles.roleBtn} ${selectedRole === 'student' ? styles.roleBtnActive : ''}`}
              onClick={() => handleRoleSelect('student')}
            >
              <span className={styles.roleIcon}>🎓</span>
              <span className={styles.roleName}>Student</span>
            </button>
            <button
              type="button"
              className={`${styles.roleBtn} ${selectedRole === 'instructor' ? styles.roleBtnActive : ''}`}
              onClick={() => handleRoleSelect('instructor')}
            >
              <span className={styles.roleIcon}>👨‍🏫</span>
              <span className={styles.roleName}>Instructor</span>
            </button>
          </div>
          <input type="hidden" {...register('role')} />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              placeholder="Alex Rivera"
              {...register('name')}
            />
            {errors.name && <span className={styles.fieldError}>⚠ {errors.name.message}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              placeholder="alex_r"
              {...register('username')}
            />
            {errors.username && <span className={styles.fieldError}>⚠ {errors.username.message}</span>}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && <span className={styles.fieldError}>⚠ {errors.email.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-mobile">Mobile Number</label>
          <input
            id="reg-mobile"
            type="tel"
            className={`${styles.input} ${errors.mobile ? styles.inputError : ''}`}
            placeholder="+1 555 000 0000"
            {...register('mobile')}
          />
          {errors.mobile && <span className={styles.fieldError}>⚠ {errors.mobile.message}</span>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-pw">Password</label>
            <input
              id="reg-pw"
              type="password"
              autoComplete="new-password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="••••••••"
              {...register('password')}
            />
            {password && (
              <div className={styles.strengthBar}>
                <div
                  className={styles.strengthFill}
                  style={{ width: `${strength.pct}%`, background: strength.color }}
                />
              </div>
            )}
            {errors.password && <span className={styles.fieldError}>⚠ {errors.password.message}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-pwc">Confirm</label>
            <input
              id="reg-pwc"
              type="password"
              autoComplete="new-password"
              className={`${styles.input} ${errors.passwordConfirm ? styles.inputError : ''}`}
              placeholder="••••••••"
              {...register('passwordConfirm')}
            />
            {errors.passwordConfirm && <span className={styles.fieldError}>⚠ {errors.passwordConfirm.message}</span>}
          </div>
        </div>

        <Button
          magnetic
          glow
          type="submit"
          disabled={mutation.isPending}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '4px' }}
        >
          {mutation.isPending ? 'Creating Account...' : 'Create Account 🚀'}
        </Button>
      </form>
    </AuthLayout>
  )
}

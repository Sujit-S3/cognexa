import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const { token = '' } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Validate token on mount
  const { data: tokenCheck, isLoading: verifying, isError: tokenInvalid } = useQuery({
    queryKey: ['resetToken', token],
    queryFn: () => authApi.verifyResetToken(token),
    enabled: Boolean(token),
    retry: false,
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.resetPassword(token, values),
    onSuccess: () => {
      setTimeout(() => navigate('/auth/login', { replace: true }), 2200)
    },
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  useEffect(() => {
    if (!token) navigate('/auth/forgot', { replace: true })
  }, [token, navigate])

  if (verifying) {
    return (
      <AuthLayout title="Verifying Link…" subtitle="Checking your security token" badgeText="Security Check">
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--nx-fg-muted)' }}>
          Validating reset token…
        </div>
      </AuthLayout>
    )
  }

  if (tokenInvalid || tokenCheck?.valid === false) {
    return (
      <AuthLayout
        badgeText="Link Expired"
        badgeTone="pink"
        title="Invalid Reset Link"
        subtitle="This password reset token is invalid or has expired."
        footerText="Need a new link?"
        footerLinkText="Request password reset"
        footerLinkTo="/auth/forgot"
      >
        <div style={{ textAlign: 'center' }}>
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
      subtitle="Enter and confirm your new password"
      footerText="Remembered your password?"
      footerLinkText="Sign in"
      footerLinkTo="/auth/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {mutation.isError && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            ⚠️ {mutation.error instanceof Error ? mutation.error.message : 'Failed to reset password'}
          </div>
        )}
        {mutation.isSuccess && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            ✅ Password updated! Redirecting to sign in…
          </div>
        )}

        {!mutation.isSuccess && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="rst-pw">New Password</label>
              <input
                id="rst-pw"
                type="password"
                autoComplete="new-password"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="••••••••••••"
                {...register('password')}
              />
              {errors.password && <span className={styles.fieldError}>⚠ {errors.password.message}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="rst-pwc">Confirm New Password</label>
              <input
                id="rst-pwc"
                type="password"
                autoComplete="new-password"
                className={`${styles.input} ${errors.passwordConfirm ? styles.inputError : ''}`}
                placeholder="••••••••••••"
                {...register('passwordConfirm')}
              />
              {errors.passwordConfirm && <span className={styles.fieldError}>⚠ {errors.passwordConfirm.message}</span>}
            </div>

            <Button
              magnetic
              glow
              type="submit"
              disabled={mutation.isPending}
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {mutation.isPending ? 'Saving…' : 'Save New Password 🔐'}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}

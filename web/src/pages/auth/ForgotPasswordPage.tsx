import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../../services/api'
import { AuthLayout } from './AuthLayout'
import { Button } from '../../design'
import styles from './AuthLayout.module.css'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authApi.recoverPassword(values.email),
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  return (
    <AuthLayout
      title="Recover Access"
      subtitle="Enter your email and we'll send a secure reset link"
      badgeText="Password Recovery"
      badgeTone="violet"
      footerText="Remembered your password?"
      footerLinkText="Sign in"
      footerLinkTo="/auth/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {mutation.isError && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            ⚠️ {mutation.error instanceof Error ? mutation.error.message : 'Something went wrong'}
          </div>
        )}
        {mutation.isSuccess && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            ✅ {mutation.data?.message || 'If that email exists, a reset link has been sent.'}
          </div>
        )}

        {!mutation.isSuccess && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="forgot-email">Email Address</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="you@example.com"
                {...register('email')}
              />
              {errors.email && <span className={styles.fieldError}>⚠ {errors.email.message}</span>}
            </div>

            <Button
              magnetic
              glow
              type="submit"
              disabled={mutation.isPending}
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              {mutation.isPending ? 'Sending...' : 'Send Reset Link 📧'}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  )
}

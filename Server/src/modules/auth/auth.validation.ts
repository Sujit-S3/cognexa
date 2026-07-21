import { z } from 'zod'

const phoneRegex = /\d{3}-\d{3}-\d{4}/

export const registerSchema = z
  .object({
    username: z.string().trim().min(3).max(30),
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    mobile: z.string().regex(phoneRegex, 'Expected phone format xxx-xxx-xxxx'),
    password: z
      .string()
      .min(8)
      .refine((v) => !v.toLowerCase().includes('password'), {
        message: 'Password cannot contain "password"',
      }),
    passwordConfirm: z.string(),
    // Self-registration can never grant 'admin' — prevents privilege escalation via signup.
    role: z.enum(['student', 'instructor']).optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  })

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export const recoverSchema = z.object({
  email: z.string().trim().email(),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
})

// Explicit allow-list — the original controller passed req.body straight into
// findByIdAndUpdate, letting a caller set their own `role`/`enrollments`/`invalidatedTokens`.
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    photo: z.string().url().optional(),
    mobile: z.string().regex(phoneRegex).optional(),
    password: z.string().min(8).optional(),
  })
  .strict()

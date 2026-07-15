import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().default('http://localhost:3000'),

  MONGODB_ATLAS_URI: z.string().min(1, 'MONGODB_ATLAS_URI is required'),

  SECRET_KEY: z
    .string()
    .min(32, 'SECRET_KEY must be at least 32 characters — generate a strong random secret'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().default(86400),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('no-reply@nexus-ai.app'),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_CONTACT_EMAIL: z.string().default('mailto:admin@nexus-ai.app'),

  AI_SERVICE_URL: z.string().url().optional(),
  AI_SERVICE_API_KEY: z.string().optional()
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    // Fail fast at boot rather than crashing later on first request (e.g. undefined JWT secret).
    console.error('✗ Invalid environment configuration:')
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
    process.exit(1)
  }

  return parsed.data
}

export const env = loadEnv()

export const isProduction = env.NODE_ENV === 'production'
export const isEmailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
export const isPushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)
export const isAiServiceConfigured = Boolean(env.AI_SERVICE_URL)

import 'dotenv/config'
import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional()
)

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional()
)

const booleanFlag = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .default(defaultValue ? 'true' : 'false')
    .transform((value) => value === 'true')

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_ENV: z.enum(['development', 'test', 'preview', 'staging', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    CLIENT_URL: z.string().url().default('http://localhost:3000'),
    APP_VERSION: z.string().default('0.1.0'),
    COMMIT_SHA: z.string().default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    MONGODB_ATLAS_URI: z
      .string()
      .regex(/^mongodb(?:\+srv)?:\/\//, 'MONGODB_ATLAS_URI must be a MongoDB connection URI'),

    SECRET_KEY: z
      .string()
      .min(32, 'SECRET_KEY must be at least 32 characters — generate a strong random secret'),
    // Access tokens are intentionally short lived. Durable sessions use the
    // rotating, opaque refresh cookie managed by the session service.
    JWT_EXPIRES_IN_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    REFRESH_COOKIE_NAME: z.string().min(1).default('cognexa_refresh'),
    COOKIE_DOMAIN: optionalString,
    COOKIE_SECURE: booleanFlag(false),

    CORS_ALLOWED_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      ),

    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

    REDIS_URL: optionalUrl,
    REDIS_REQUIRED: booleanFlag(false),
    REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(5_000),

    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    EMAIL_FROM: z.string().default('no-reply@cognexa.app'),

    VAPID_PUBLIC_KEY: optionalString,
    VAPID_PRIVATE_KEY: optionalString,
    VAPID_CONTACT_EMAIL: z.string().default('mailto:admin@cognexa.app'),

    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
    CLOUDINARY_UPLOAD_FOLDER: z.string().default('cognexa'),

    AI_SERVICE_URL: optionalUrl,
    AI_SERVICE_API_KEY: optionalString,
    AI_HEALTHCHECK_URL: optionalUrl,
    STORAGE_HEALTHCHECK_URL: optionalUrl,

    METRICS_AUTH_TOKEN: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().min(32).optional()
    ),
    OTEL_ENABLED: booleanFlag(false),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: optionalUrl,
    OTEL_SERVICE_NAME: z.string().min(1).default('cognexa-server'),
    FEATURE_FLAGS: z
      .string()
      .default('ai_tutor,certificates')
      .transform((value) =>
        value
          .split(',')
          .map((flag) => flag.trim())
          .filter(Boolean)
      ),
  })
  .superRefine((values, context) => {
    if (values.REDIS_REQUIRED && !values.REDIS_URL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['REDIS_URL'],
        message: 'REDIS_URL is required when REDIS_REQUIRED=true',
      })
    }

    if (values.OTEL_ENABLED && !values.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'],
        message: 'An OTLP traces endpoint is required when OTEL_ENABLED=true',
      })
    }

    if (values.APP_ENV === 'staging' || values.APP_ENV === 'production') {
      if (values.NODE_ENV !== 'production') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NODE_ENV'],
          message: 'NODE_ENV must be production in staging and production deployments',
        })
      }

      const publicUrls = [values.CLIENT_URL, ...values.CORS_ALLOWED_ORIGINS]
      if (publicUrls.some((url) => !url.startsWith('https://'))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ALLOWED_ORIGINS'],
          message: 'CLIENT_URL and every CORS origin must use HTTPS in staging and production',
        })
      }

      if (/replace|change|example|development/i.test(values.SECRET_KEY)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SECRET_KEY'],
          message: 'SECRET_KEY must be a generated secret, not an example value',
        })
      }

      if (!values.REDIS_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['REDIS_URL'],
          message: 'REDIS_URL is required for distributed production rate limits',
        })
      }

      if (!values.METRICS_AUTH_TOKEN) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['METRICS_AUTH_TOKEN'],
          message: 'METRICS_AUTH_TOKEN is required outside non-production environments',
        })
      }

      if (!values.COOKIE_SECURE) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in staging and production',
        })
      }

      if (values.COMMIT_SHA === 'development') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COMMIT_SHA'],
          message: 'COMMIT_SHA must identify the deployed immutable release',
        })
      }
    }
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
export const isDeployedEnvironment = env.APP_ENV === 'staging' || env.APP_ENV === 'production'
export const isEmailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
export const isPushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)
export const isAiServiceConfigured = Boolean(env.AI_SERVICE_URL)
export const isRedisConfigured = Boolean(env.REDIS_URL)
export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
)

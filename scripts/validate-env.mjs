import fs from 'node:fs'
import path from 'node:path'

function parseEnvFile(filePath) {
  const values = {}
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

const fileFlag = process.argv.indexOf('--file')
const filePath = fileFlag >= 0 ? path.resolve(process.argv[fileFlag + 1] ?? '') : undefined
const values = { ...process.env, ...(filePath ? parseEnvFile(filePath) : {}) }
const environment = values.APP_ENV ?? 'development'
const errors = []

function requireValue(name) {
  if (!values[name]?.trim()) errors.push(`${name} is required`)
}

function requireUrl(name, protocols) {
  requireValue(name)
  if (!values[name]) return
  try {
    const parsed = new URL(values[name])
    if (!protocols.includes(parsed.protocol)) errors.push(`${name} must use ${protocols.join(' or ')}`)
  } catch {
    errors.push(`${name} must be a valid URL`)
  }
}

if (!['development', 'test', 'preview', 'staging', 'production'].includes(environment)) {
  errors.push('APP_ENV must be development, test, preview, staging, or production')
}

requireUrl('MONGODB_ATLAS_URI', ['mongodb:', 'mongodb+srv:'])
requireValue('SECRET_KEY')
requireUrl('CLIENT_URL', ['http:', 'https:'])
requireValue('CORS_ALLOWED_ORIGINS')

if ((values.SECRET_KEY ?? '').length < 32) errors.push('SECRET_KEY must contain at least 32 characters')

if (environment === 'staging' || environment === 'production') {
  if (values.NODE_ENV !== 'production') errors.push('NODE_ENV must be production')
  if (/replace|change|example|development/i.test(values.SECRET_KEY ?? '')) {
    errors.push('SECRET_KEY must not be an example value')
  }
  requireUrl('REDIS_URL', ['redis:', 'rediss:'])
  requireValue('METRICS_AUTH_TOKEN')
  if ((values.METRICS_AUTH_TOKEN ?? '').length < 32) {
    errors.push('METRICS_AUTH_TOKEN must contain at least 32 characters')
  }
  requireValue('COMMIT_SHA')
  if (values.COMMIT_SHA === 'development') errors.push('COMMIT_SHA must identify an immutable release')
  if (values.COOKIE_SECURE !== 'true') errors.push('COOKIE_SECURE must be true')

  const publicUrls = [values.CLIENT_URL, ...(values.CORS_ALLOWED_ORIGINS ?? '').split(',')]
  if (publicUrls.some((value) => value && !value.trim().startsWith('https://'))) {
    errors.push('CLIENT_URL and all CORS_ALLOWED_ORIGINS must use HTTPS')
  }

  const featureFlags = (values.FEATURE_FLAGS ?? 'ai_tutor')
    .split(',')
    .map((flag) => flag.trim())
    .filter(Boolean)
  if (featureFlags.includes('ai_tutor')) {
    requireUrl('AI_SERVICE_URL', ['http:', 'https:'])
    requireValue('AI_SERVICE_API_KEY')
  }
  for (const name of [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]) {
    requireValue(name)
  }
}

if (values.OTEL_ENABLED === 'true') requireUrl('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', ['http:', 'https:'])

for (const group of [
  ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'],
  ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
  ['AI_SERVICE_URL', 'AI_SERVICE_API_KEY'],
]) {
  const present = group.filter((name) => values[name]?.trim())
  if (present.length > 0 && present.length < group.length) {
    errors.push(`${group.join(', ')} must be configured together`)
  }
}

if (errors.length) {
  console.error(`Environment validation failed for ${environment}:`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Environment validation passed for ${environment}; no secret values were printed.`)

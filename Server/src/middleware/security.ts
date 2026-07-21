import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import { env } from '../config/env'
import { redisClient } from '../config/redis'

function distributedStore(scope: string): RedisStore | undefined {
  const client = redisClient
  if (!client) return undefined

  return new RedisStore({
    prefix: `cognexa:${env.APP_ENV}:rate-limit:${scope}:`,
    sendCommand: (...args: string[]) => client.sendCommand(args) as Promise<RedisReply>,
  })
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (curl, mobile, server-to-server) which send no Origin header.
    if (!origin || env.CORS_ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
      return
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS policy`))
  },
  credentials: true,
})

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
})

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  store: distributedStore('api'),
  standardHeaders: true,
  legacyHeaders: false,
})

// Tighter limiter for auth endpoints (login/register/password reset) — brute-force/credential-stuffing defense.
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  store: distributedStore('auth'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
})

export const aiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AI_RATE_LIMIT_MAX,
  store: distributedStore('ai'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached. Please wait before trying again.' },
})

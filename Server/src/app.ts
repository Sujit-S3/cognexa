import express, { Application, Request, Response, Router } from 'express'
import crypto from 'crypto'
import { corsMiddleware, helmetMiddleware, apiRateLimiter } from './middleware/security'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { authRouter } from './modules/auth/auth.routes'
import { courseRouter, deadlinesRouter } from './modules/courses/courses.routes'
import { lectureRouter } from './modules/lectures/lectures.routes'
import { requestLogger } from './middleware/requestLogger'
import { env } from './config/env'
import { aiRouter } from './modules/ai/ai.routes'
import { instructorRouter, uploadRouter } from './modules/instructor/instructor.routes'
import { metricsContentType, metricsMiddleware, renderMetrics } from './services/metrics.service'
import { getDependencyHealth } from './services/health.service'
import { asyncHandler } from './middleware/asyncHandler'

const processStartedAt = new Date()

function hasValidMetricsToken(req: Request): boolean {
  if (!env.METRICS_AUTH_TOKEN) return true

  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''
  const expectedBuffer = Buffer.from(env.METRICS_AUTH_TOKEN)
  const suppliedBuffer = Buffer.from(supplied)
  return (
    expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  )
}

export function createApp(): Application {
  const app = express()

  // Behind a proxy/load balancer, trust X-Forwarded-* so rate limiting keys on the real client IP.
  app.set('trust proxy', 1)

  app.use(requestLogger)
  app.use(metricsMiddleware)
  app.use(helmetMiddleware)
  app.use(corsMiddleware)
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // Liveness/readiness probe — no auth, no rate limit.
  app.get(['/health', '/health/live'], (_req: Request, res: Response) => {
    res.set('cache-control', 'no-store').json({
      status: 'ok',
      service: 'cognexa-server',
      version: env.APP_VERSION,
      commit: env.COMMIT_SHA,
      uptimeSeconds: Math.floor(process.uptime()),
    })
  })

  app.get('/health/startup', (_req: Request, res: Response) => {
    res.set('cache-control', 'no-store').json({
      status: 'started',
      startedAt: processStartedAt.toISOString(),
      version: env.APP_VERSION,
      commit: env.COMMIT_SHA,
    })
  })

  app.get(
    '/health/ready',
    asyncHandler(async (_req: Request, res: Response) => {
      const health = await getDependencyHealth(false)
      res
        .status(health.status === 'not-ready' ? 503 : 200)
        .set('cache-control', 'no-store')
        .json({
          status: health.status,
          database: health.checks.database,
          redis: health.checks.redis,
        })
    })
  )

  app.get(
    '/health/dependencies',
    asyncHandler(async (_req: Request, res: Response) => {
      const health = await getDependencyHealth()
      res
        .status(health.status === 'not-ready' ? 503 : 200)
        .set('cache-control', 'no-store')
        .json(health)
    })
  )

  app.get(
    '/metrics',
    asyncHandler(async (req: Request, res: Response) => {
      if (!hasValidMetricsToken(req)) {
        res.status(401).set('cache-control', 'no-store').json({ error: 'Unauthorized' })
        return
      }
      res
        .set('cache-control', 'no-store')
        .type(metricsContentType)
        .send(await renderMetrics())
    })
  )

  // Global API rate limiter applied to everything below the health check.
  app.use(apiRateLimiter)

  const apiRouter = Router()
  apiRouter.get('/config', (_req: Request, res: Response) => {
    res.set('cache-control', 'public, max-age=60').json({
      version: env.APP_VERSION,
      environment: env.APP_ENV,
      features: Object.fromEntries(env.FEATURE_FLAGS.map((flag) => [flag, true])),
    })
  })
  apiRouter.use('/auth', authRouter)
  apiRouter.use('/courses', courseRouter)
  apiRouter.use('/deadlines', deadlinesRouter)
  apiRouter.use('/ai', aiRouter)
  apiRouter.use('/instructor', instructorRouter)
  apiRouter.use('/uploads', uploadRouter)
  apiRouter.use('/courses/:courseId/lectures', lectureRouter)

  // Versioned contracts are canonical. Root aliases remain temporarily for the
  // legacy client and advertise their deprecation on every response.
  app.use('/api/v1', apiRouter)
  app.use((_req, res, next) => {
    res.set('deprecation', 'true')
    res.set('sunset', 'Wed, 31 Dec 2026 23:59:59 GMT')
    res.set('link', '</api/v1>; rel="successor-version"')
    next()
  })
  app.use('/', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

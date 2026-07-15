import express, { Application, Request, Response } from 'express'
import { corsMiddleware, helmetMiddleware, apiRateLimiter } from './middleware/security'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { authRouter } from './modules/auth/auth.routes'
import { courseRouter, deadlinesRouter } from './modules/courses/courses.routes'
import { lectureRouter } from './modules/lectures/lectures.routes'

export function createApp(): Application {
  const app = express()

  // Behind a proxy/load balancer, trust X-Forwarded-* so rate limiting keys on the real client IP.
  app.set('trust proxy', 1)

  app.use(helmetMiddleware)
  app.use(corsMiddleware)
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // Liveness/readiness probe — no auth, no rate limit.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'nexus-ai-server' })
  })

  // Global API rate limiter applied to everything below the health check.
  app.use(apiRateLimiter)

  app.use('/auth', authRouter)
  app.use('/courses', courseRouter)
  app.use('/deadlines', deadlinesRouter)
  // Lectures are nested under a course; mergeParams lets the router read :courseId.
  app.use('/courses/:courseId/lectures', lectureRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

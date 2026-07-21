import type { NextFunction, Request, Response } from 'express'
import { collectDefaultMetrics, Counter, Histogram, register } from 'prom-client'

collectDefaultMetrics({ prefix: 'cognexa_' })

const httpRequests = new Counter({
  name: 'cognexa_http_requests_total',
  help: 'Total HTTP requests handled by the Cognexa API.',
  labelNames: ['method', 'route', 'status_code'] as const,
})

const httpDuration = new Histogram({
  name: 'cognexa_http_request_duration_seconds',
  help: 'Cognexa API request duration in seconds.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
})

function routeLabel(req: Request): string {
  const route = req.route as { path?: unknown } | undefined
  return typeof route?.path === 'string' ? `${req.baseUrl}${route.path}` : 'unmatched'
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const stopTimer = httpDuration.startTimer()

  res.once('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode),
    }
    httpRequests.inc(labels)
    stopTimer(labels)
  })

  next()
}

export async function renderMetrics(): Promise<string> {
  return register.metrics()
}

export const metricsContentType = register.contentType

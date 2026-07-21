import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Application } from 'express'
import type { Server } from 'http'

// Boot the app in isolation (no DB required) and exercise the routes that don't touch Mongo:
// health, 404 handling, and request validation. This locks the security/error/validation wiring.
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.METRICS_AUTH_TOKEN ??= 'test-metrics-token-that-is-at-least-32-characters'
process.env.NODE_ENV = 'test'

let app: Application
let server: Server
let baseUrl: string

beforeAll(async () => {
  const { createApp } = await import('../app')
  app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

describe('app wiring', () => {
  it('serves the health check', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok' })
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

  it('propagates a valid request id for log correlation', async () => {
    const res = await fetch(`${baseUrl}/health`, { headers: { 'x-request-id': 'test-request-42' } })
    expect(res.headers.get('x-request-id')).toBe('test-request-42')
  })

  it('reports not-ready when the database is disconnected', async () => {
    const res = await fetch(`${baseUrl}/health/ready`)
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ status: 'not-ready', database: 'disconnected' })
  })

  it('exposes startup and dependency probes without leaking configuration', async () => {
    const startup = await fetch(`${baseUrl}/health/startup`)
    expect(startup.status).toBe(200)
    expect(await startup.json()).toMatchObject({ status: 'started' })

    const dependencies = await fetch(`${baseUrl}/health/dependencies`)
    expect(dependencies.status).toBe(503)
    expect(await dependencies.json()).toMatchObject({
      status: 'not-ready',
      checks: {
        database: 'disconnected',
        redis: 'not-configured',
      },
    })
  })

  it('exports Prometheus metrics without exposing application secrets', async () => {
    const unauthorized = await fetch(`${baseUrl}/metrics`)
    expect(unauthorized.status).toBe(401)

    const res = await fetch(`${baseUrl}/metrics`, {
      headers: { authorization: `Bearer ${process.env.METRICS_AUTH_TOKEN}` },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
    const metrics = await res.text()
    expect(metrics).toContain('cognexa_http_requests_total')
    expect(metrics).not.toContain(process.env.SECRET_KEY)
  })

  it('exposes only public runtime configuration on the versioned API', async () => {
    const res = await fetch(`${baseUrl}/api/v1/config`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(body).toHaveProperty('features')
    expect(body).not.toHaveProperty('SECRET_KEY')
  })

  it('sets Helmet security headers', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('returns 404 for unknown routes', async () => {
    const res = await fetch(`${baseUrl}/does-not-exist`)
    expect(res.status).toBe(404)
    expect(await res.json()).toHaveProperty('error')
  })

  it('rejects invalid login payloads with 422', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Validation failed')
  })

  it('rejects refresh attempts without an HttpOnly session cookie', async () => {
    const status = await fetch(`${baseUrl}/api/v1/auth/session`)
    expect(status.status).toBe(200)
    expect(await status.json()).toEqual({ hasSession: false })

    const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, { method: 'POST' })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Session expired' })
  })

  it('requires authentication before accepting AI tutor requests', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Explain Jacobians' }] }),
    })
    expect(res.status).toBe(401)
  })

  it('protects the instructor dashboard', async () => {
    const res = await fetch(`${baseUrl}/api/v1/instructor/dashboard`)
    expect(res.status).toBe(401)
  })

  it('protects signed course media uploads', async () => {
    const res = await fetch(`${baseUrl}/api/v1/uploads/cloudinary/signature`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(401)
  })

  it('marks legacy unversioned routes as deprecated', async () => {
    const res = await fetch(`${baseUrl}/config`)
    expect(res.headers.get('deprecation')).toBe('true')
    expect(res.headers.get('link')).toContain('/api/v1')
  })
})

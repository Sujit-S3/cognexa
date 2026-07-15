import { describe, it, expect, beforeAll } from 'vitest'
import type { Application } from 'express'
import type { Server } from 'http'

// Boot the app in isolation (no DB required) and exercise the routes that don't touch Mongo:
// health, 404 handling, and request validation. This locks the security/error/validation wiring.
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/nexus-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
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

describe('app wiring', () => {
  it('serves the health check', async () => {
    const res = await fetch(`${baseUrl}/health`)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok' })
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
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Validation failed')
  })
})

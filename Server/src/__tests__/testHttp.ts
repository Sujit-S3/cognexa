import { EventEmitter } from 'events'
import { vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

type Middleware = (req: Request, res: Response, next: NextFunction) => unknown

// Many controllers are wrapped in asyncHandler, whose returned wrapper fires the inner async
// logic without returning a promise tied to its completion — so `await middleware(...)` resolves
// immediately, before the real (often DB-backed) work finishes. Instead, resolve once the
// middleware reaches one of its real terminal actions: next(), res.json(...), res.send(...), or
// res.end(...) (the last call in every res.status(...).json/send/end(...) response). `body`
// captures whatever was passed to res.json(...)/res.send(...), typed `T`, so callers don't have
// to dig into `res.json.mock.calls` themselves.
export function invokeMiddleware<T = unknown>(
  middleware: Middleware,
  req: Request
): Promise<{ req: Request; res: Response; next: ReturnType<typeof vi.fn>; body: T }> {
  return new Promise((resolve) => {
    let body: T
    const next = vi.fn((): void => resolve({ req, res, next, body }))
    // Extends EventEmitter (not a plain object) so a real Node Writable-stream consumer piped
    // into this mock — e.g. certificates.controller.ts's PDFDocument.pipe(res) — can call the
    // .on('drain'/'close'/'error', ...) listeners real stream.pipe() registers, instead of
    // throwing "res.on is not a function".
    const res = Object.assign(new EventEmitter(), {
      status: vi.fn(function status(this: Response): Response {
        return this
      }),
      json: vi.fn((payload: T): void => {
        body = payload
        resolve({ req, res, next, body })
      }),
      send: vi.fn((payload?: T): void => {
        body = payload as T
        resolve({ req, res, next, body })
      }),
      write: vi.fn((): boolean => true),
      end: vi.fn((): void => {
        resolve({ req, res, next, body })
      }),
      set: vi.fn(function set(this: Response): Response {
        return this
      }),
      append: vi.fn(function append(this: Response): Response {
        return this
      }),
    }) as unknown as Response

    middleware(req, res, next as unknown as NextFunction)
  })
}

export function mockReq(overrides: Record<string, unknown> = {}): Request {
  return {
    get: () => undefined,
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as unknown as Request
}

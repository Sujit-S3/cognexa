import { beforeAll, describe, expect, it } from 'vitest'

process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let buildPasswordResetUrl: typeof import('../services/email.service').buildPasswordResetUrl
let escapeEmailHtml: typeof import('../services/email.service').escapeEmailHtml

beforeAll(async () => {
  ;({ buildPasswordResetUrl, escapeEmailHtml } = await import('../services/email.service'))
})

describe('email safety and routing', () => {
  it('builds a password reset URL that matches the web route', () => {
    expect(buildPasswordResetUrl('https://app.cognexa.test/', 'abc123')).toBe(
      'https://app.cognexa.test/auth/reset/abc123'
    )
  })

  it('escapes untrusted account names before inserting them into email HTML', () => {
    expect(escapeEmailHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    )
  })
})

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

const sendMail = vi.fn(async (_options: { to: string; subject: string; html: string; text?: string }) => ({
  messageId: 'test-message-id',
}))
const createTransport = vi.fn(() => ({ sendMail }))

vi.mock('nodemailer', () => ({
  default: { createTransport },
}))

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

describe('sendEmail (SMTP not configured)', () => {
  let email: typeof import('../services/email.service')

  beforeAll(async () => {
    email = await import('../services/email.service')
  })

  it('logs instead of sending when SMTP is not configured', async () => {
    await expect(
      email.sendEmail({ to: 'learner@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    ).resolves.toBeUndefined()
    expect(createTransport).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('resolves sendPasswordResetEmail and sendWelcomeEmail without throwing when unconfigured', async () => {
    await expect(email.sendPasswordResetEmail('learner@example.com', 'tok123')).resolves.toBeUndefined()
    await expect(email.sendWelcomeEmail('learner@example.com', 'Ada')).resolves.toBeUndefined()
  })
})

describe('sendEmail (SMTP configured)', () => {
  let email: typeof import('../services/email.service')

  beforeAll(async () => {
    vi.resetModules()
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '587'
    process.env.SMTP_USER = 'smtp-user'
    process.env.SMTP_PASS = 'smtp-pass'
    email = await import('../services/email.service')
  })

  afterAll(() => {
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS
  })

  it('sends via the transporter when SMTP is configured', async () => {
    await email.sendEmail({ to: 'learner@example.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(createTransport).toHaveBeenCalledTimes(1)
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'learner@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    )
  })

  it('reuses a single transporter instance across calls', async () => {
    // vitest.config.ts clears mock call history before every test, so createTransport starts
    // at zero calls here even though the previous test already triggered one — a second send
    // should reuse the module-level transporter rather than calling createTransport again.
    await email.sendEmail({ to: 'learner@example.com', subject: 'Hi', html: '<p>Hi</p>' })
    expect(createTransport).not.toHaveBeenCalled()
  })

  it('includes the reset URL in the password reset email body', async () => {
    await email.sendPasswordResetEmail('learner@example.com', 'reset-token-123')

    const lastCall = sendMail.mock.calls.at(-1)![0] as { html: string }
    expect(lastCall.html).toContain('/auth/reset/reset-token-123')
  })

  it('escapes the learner name in the welcome email body', async () => {
    await email.sendWelcomeEmail('learner@example.com', '<script>alert(1)</script>')

    const lastCall = sendMail.mock.calls.at(-1)![0] as { html: string }
    expect(lastCall.html).not.toContain('<script>')
    expect(lastCall.html).toContain('&lt;script&gt;')
  })
})

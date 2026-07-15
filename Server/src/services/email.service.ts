import nodemailer, { Transporter } from 'nodemailer'
import { env, isEmailConfigured } from '../config/env'
import { logger } from '../config/logger'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!isEmailConfigured) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    })
  }
  return transporter
}

interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
}

// Replaces the old dead SendGrid stub (hardcoded to test@example.com, never actually imported).
// Falls back to logging the email in development/when SMTP isn't configured, instead of failing.
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<void> {
  const client = getTransporter()

  if (!client) {
    logger.info({ to, subject }, 'Email service not configured — logging email instead of sending')
    return
  }

  await client.sendMail({ from: env.EMAIL_FROM, to, subject, html, text })
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${resetToken}`
  await sendEmail({
    to,
    subject: 'Reset your NEXUS AI password',
    html: `<p>Click the link below to reset your password. This link expires in 15 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  })
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Welcome to NEXUS AI',
    html: `<p>Hi ${name}, welcome to NEXUS AI — the future of intelligent learning.</p>`
  })
}

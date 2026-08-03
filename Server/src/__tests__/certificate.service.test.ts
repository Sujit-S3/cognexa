import { describe, expect, it } from 'vitest'
import { generateCertificateCode, renderCertificatePdf } from '../services/certificate.service'

describe('generateCertificateCode', () => {
  it('produces a CGX-prefixed code', () => {
    expect(generateCertificateCode()).toMatch(/^CGX-[0-9A-Z]+-[0-9A-F]{6}$/)
  })

  it('produces a unique code on every call', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateCertificateCode()))
    expect(codes.size).toBe(20)
  })
})

describe('renderCertificatePdf', () => {
  it('streams a non-empty PDF document', async () => {
    const doc = renderCertificatePdf({
      learnerName: 'Nora Learner',
      courseName: 'Systems Thinking',
      gradeLetter: 'A',
      finishedAt: new Date('2026-01-01'),
      verificationCode: 'CGX-TEST-ABCDEF',
    })

    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve())
      doc.on('error', reject)
    })

    const pdf = Buffer.concat(chunks)
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })
})

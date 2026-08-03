import crypto from 'crypto'
import PDFDocument from 'pdfkit'

export function generateCertificateCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `CGX-${timestamp}-${random}`
}

export interface CertificateData {
  learnerName: string
  courseName: string
  gradeLetter: string
  finishedAt: Date
  verificationCode: string
}

// Regenerated on demand from the Achievement document each time it's requested — achievements
// never change after creation, so this is deterministic, and there's no object storage in this
// codebase to persist a generated artifact into.
export function renderCertificatePdf(data: CertificateData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 56 })

  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a')
  doc
    .lineWidth(2)
    .strokeColor('#6366f1')
    .rect(28, 28, doc.page.width - 56, doc.page.height - 56)
    .stroke()

  doc.fillColor('#a5b4fc').fontSize(14).font('Helvetica-Bold').text('COGNEXA', 0, 80, { align: 'center' })
  doc
    .fillColor('#ffffff')
    .fontSize(34)
    .font('Helvetica-Bold')
    .text('Certificate of Completion', { align: 'center' })
  doc.moveDown(1.4)
  doc.fillColor('#cbd5e1').fontSize(15).font('Helvetica').text('This certifies that', { align: 'center' })
  doc.moveDown(0.4)
  doc.fillColor('#ffffff').fontSize(30).font('Helvetica-Bold').text(data.learnerName, { align: 'center' })
  doc.moveDown(0.4)
  doc
    .fillColor('#cbd5e1')
    .fontSize(15)
    .font('Helvetica')
    .text('has successfully completed', { align: 'center' })
  doc.moveDown(0.4)
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text(data.courseName, { align: 'center' })
  doc.moveDown(1.6)
  doc
    .fillColor('#cbd5e1')
    .fontSize(12)
    .font('Helvetica')
    .text(`Grade ${data.gradeLetter}  ·  Completed ${data.finishedAt.toLocaleDateString()}`, {
      align: 'center',
    })
  doc.moveDown(2.4)
  doc
    .fillColor('#64748b')
    .fontSize(10)
    .text(`Verify at cognexa.app/certificates/verify/${data.verificationCode}`, { align: 'center' })

  doc.end()
  return doc
}

import { GlassCard, Badge, Button } from '../../design'
import { useAuthStore } from '../../stores/authStore'
import styles from './CertificateModal.module.css'

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  courseName?: string
  dateIssued?: string
  certId?: string
}

export function CertificateModal({
  isOpen,
  onClose,
  courseName = 'AI & Robotics — Neural Control Systems',
  dateIssued = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  certId = 'NEXUS-CERT-9942A',
}: CertificateModalProps) {
  const { user } = useAuthStore()

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    alert(`Certificate link copied to clipboard: https://nexus-ai.edu/verify/${certId}`)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <GlassCard className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <div className={styles.certificateFrame}>
          <div className={styles.seal}>🎖️</div>
          <Badge tone="violet">NEXUS AI VERIFIED CREDENTIAL</Badge>

          <h2 className={styles.certTitle}>Certificate of Mastery</h2>
          <div className={styles.presentedTo}>This officially certifies that</div>

          <div className={styles.studentName}>
            {user ? user.name || user.email : 'Alex Rivera'}
          </div>

          <p className={styles.reason}>
            Has successfully demonstrated advanced proficiency, completed all required interactive assessments, code labs, and met all rigor criteria for the professional curriculum:
          </p>

          <div className={styles.courseName}>{courseName}</div>

          <div className={styles.footerRow}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff' }}>Date Issued:</div>
              <div>{dateIssued}</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '2px' }}>📱</div>
              <Badge tone="cyan" style={{ fontSize: '0.72rem' }}>ID: {certId}</Badge>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#fff' }}>Chief AI Architect:</div>
              <div style={{ fontFamily: 'var(--nx-font-mono, monospace)', color: 'var(--nx-accent-cyan)' }}>Dr. Marcus Vance</div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button magnetic glow onClick={handlePrint} style={{ padding: '12px 24px' }}>
            Download PDF / Print 🖨️
          </Button>
          <Button variant="secondary" onClick={handleShare} style={{ padding: '12px 24px' }}>
            Share Credential 🔗
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}

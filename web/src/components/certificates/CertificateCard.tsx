import { useState } from 'react'
import { Award } from 'lucide-react'
import { certificatesApi, type AchievementView } from '../../services/api'
import { GlassCard, Badge, Button } from '../../design'
import styles from './CertificateCard.module.css'

export function CertificateCard({ achievement }: { achievement: AchievementView }) {
  const courseName = typeof achievement.course === 'string' ? 'Course' : achievement.course.name
  const [downloading, setDownloading] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    setFailed(false)
    try {
      const blob = await certificatesApi.downloadPdf(achievement.id)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `cognexa-certificate-${achievement.certificate ?? achievement.id}.pdf`
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setFailed(true)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <GlassCard className={styles.card}>
      <div className={styles.icon}>
        <Award size={22} />
      </div>
      <div className={styles.body}>
        <h3>{courseName}</h3>
        <p>
          Grade {achievement.gradeLetter} · {achievement.score}
        </p>
        <span className={styles.date}>Completed {new Date(achievement.finishedAt).toLocaleDateString()}</span>
      </div>
      {achievement.certificate && (
        <div className={styles.actions}>
          <Badge tone="success">Verified</Badge>
          <Button variant="secondary" size="sm" disabled={downloading} onClick={() => void handleDownload()}>
            {downloading ? 'Opening…' : 'View certificate'}
          </Button>
          {failed && (
            <p role="alert" style={{ color: 'var(--nx-danger)', fontSize: '0.78rem' }}>
              Could not open the certificate. Please try again.
            </p>
          )}
        </div>
      )}
    </GlassCard>
  )
}

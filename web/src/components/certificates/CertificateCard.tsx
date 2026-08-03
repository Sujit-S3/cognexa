import { Award } from 'lucide-react'
import { certificatesApi, type AchievementView } from '../../services/api'
import { GlassCard, Badge, Button } from '../../design'
import styles from './CertificateCard.module.css'

export function CertificateCard({ achievement }: { achievement: AchievementView }) {
  const courseName = typeof achievement.course === 'string' ? 'Course' : achievement.course.name

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
          <a href={certificatesApi.downloadUrl(achievement.id)} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">
              View certificate
            </Button>
          </a>
        </div>
      )}
    </GlassCard>
  )
}

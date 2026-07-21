import clsx from 'clsx'
import styles from './BrandLogo.module.css'

interface BrandLogoProps {
  compact?: boolean
  className?: string
}

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <span className={clsx(styles.logo, className)} aria-label="Cognexa">
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.core}>C</span>
        <span className={styles.node} />
      </span>
      {!compact && <span className={styles.wordmark}>Cognexa</span>}
    </span>
  )
}

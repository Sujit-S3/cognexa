import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard, Badge } from '../../design'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  badgeText?: string
  badgeTone?: 'brand' | 'cyan' | 'violet' | 'pink' | 'success'
  title: string
  subtitle: string
  children: ReactNode
  footerText?: string
  footerLinkText?: string
  footerLinkTo?: string
}

export function AuthLayout({
  badgeText = 'Secure Portal',
  badgeTone = 'brand',
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.cardWrap}>
        <div className={styles.header}>
          <Badge tone={badgeTone}>{badgeText}</Badge>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        {children}

        {footerText && footerLinkText && footerLinkTo && (
          <div className={styles.footer}>
            {footerText}{' '}
            <Link to={footerLinkTo} className={styles.link}>
              {footerLinkText}
            </Link>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

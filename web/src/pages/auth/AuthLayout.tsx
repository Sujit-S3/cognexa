import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard, Badge } from '../../design'
import { BrandLogo } from '../../components/brand/BrandLogo'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  badgeText?: string
  badgeTone?: 'brand' | 'success' | 'pink' | 'cyan' | 'violet' | 'neutral'
  footerText?: string
  footerLinkText?: string
  footerLinkTo?: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  badgeText = 'Cognexa',
  badgeTone = 'brand',
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.orbs} />
      <GlassCard elevation="raised" glow className={styles.card}>
        <Link to="/" className={styles.brandHome} aria-label="Cognexa home">
          <BrandLogo />
        </Link>
        <div className={styles.header}>
          <Badge tone={badgeTone}>{badgeText}</Badge>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {children}
        {footerText && footerLinkText && footerLinkTo && (
          <p className={styles.footer}>
            {footerText}{' '}
            <Link to={footerLinkTo} className={styles.footerLink}>
              {footerLinkText}
            </Link>
          </p>
        )}
      </GlassCard>
    </main>
  )
}

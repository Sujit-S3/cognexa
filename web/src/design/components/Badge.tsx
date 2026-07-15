import type { ReactNode } from 'react'
import styles from './Badge.module.css'
import clsx from 'clsx'

type Tone = 'brand' | 'cyan' | 'violet' | 'pink' | 'success' | 'neutral'

export function Badge({ children, tone = 'brand', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={clsx(styles.badge, styles[tone], className)}>{children}</span>
}

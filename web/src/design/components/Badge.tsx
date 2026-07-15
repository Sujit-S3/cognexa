import type { ReactNode } from 'react'
import styles from './Badge.module.css'
import clsx from 'clsx'

type Tone = 'brand' | 'cyan' | 'violet' | 'pink' | 'success' | 'neutral'

export function Badge({ children, tone = 'brand', className, style }: { children: ReactNode; tone?: Tone; className?: string; style?: React.CSSProperties }) {
  return <span className={clsx(styles.badge, styles[tone], className)} style={style}>{children}</span>
}

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import clsx from 'clsx'
import styles from './GlassCard.module.css'

type Elevation = 'flat' | 'raised' | 'floating'
type Intensity = 'subtle' | 'regular' | 'strong'

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> {
  children?: React.ReactNode
  /** Shadow depth. */
  elevation?: Elevation
  /** Glass fill opacity / blur strength. */
  intensity?: Intensity
  /** Adds the animated light-reflection sweep on hover. */
  reflective?: boolean
  /** Lifts + intensifies glow on hover (physics spring). */
  interactive?: boolean
  /** Draw a gradient-brand hairline border. */
  glow?: boolean
}

/**
 * GlassCard — the core surface primitive of the Cognexa design system.
 * All panels/widgets/cards compose this so glass, blur, borders, light reflection
 * and elevation stay consistent and token-driven.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  {
    elevation = 'raised',
    intensity = 'regular',
    reflective = false,
    interactive = false,
    glow = false,
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <motion.div
      ref={ref}
      className={clsx(
        styles.card,
        styles[`elev-${elevation}`],
        styles[`intensity-${intensity}`],
        reflective && styles.reflective,
        interactive && styles.interactive,
        glow && styles.glow,
        className
      )}
      whileHover={
        interactive ? { y: -6, transition: { type: 'spring', stiffness: 300, damping: 22 } } : undefined
      }
      {...rest}
    >
      {reflective && <span aria-hidden className={styles.sheen} />}
      <div className={styles.content}>{children}</div>
    </motion.div>
  )
})

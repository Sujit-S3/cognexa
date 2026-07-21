import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { revealVariants, staggerContainer } from '../tokens'

interface RevealProps {
  children: ReactNode
  /** Stagger children that are themselves RevealItem/motion elements. */
  stagger?: boolean
  className?: string
  style?: React.CSSProperties
  as?: 'div' | 'section' | 'ul' | 'li'
  delay?: number
}

/**
 * Reveal — scroll-triggered entrance using the shared revealVariants, so every
 * section animates in with one consistent motion language. Fires once on enter.
 */
export function Reveal({ children, stagger = false, className, style, delay = 0 }: RevealProps) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={stagger ? staggerContainer : revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  )
}

/** A single staggered child; place inside a <Reveal stagger>. */
export function RevealItem({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <motion.div className={className} style={style} variants={revealVariants}>
      {children}
    </motion.div>
  )
}

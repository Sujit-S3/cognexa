import { forwardRef, useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'framer-motion'
import clsx from 'clsx'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'glass'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  children?: ReactNode
  variant?: Variant
  size?: Size
  /** Enables cursor-following magnetic pull (physics spring). */
  magnetic?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

/**
 * Button — token-driven, with an optional magnetic interaction: the button
 * eases toward the cursor via a spring, part of the shared motion language.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', magnetic = false, leftIcon, rightIcon, className, children, ...rest },
  ref,
) {
  const localRef = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 260, damping: 18 })
  const springY = useSpring(y, { stiffness: 260, damping: 18 })

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!magnetic) return
    const el = localRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const relX = e.clientX - (rect.left + rect.width / 2)
    const relY = e.clientY - (rect.top + rect.height / 2)
    x.set(relX * 0.35)
    y.set(relY * 0.35)
  }

  const reset = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={(node) => {
        localRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      className={clsx(styles.btn, styles[variant], styles[size], className)}
      style={magnetic ? { x: springX, y: springY } : undefined}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      whileTap={{ scale: 0.96 }}
      {...rest}
    >
      {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
      <span className={styles.label}>{children}</span>
      {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
    </motion.button>
  )
})

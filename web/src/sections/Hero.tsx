import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Badge, Button } from '../design'
import styles from './Hero.module.css'

const AIOrb = lazy(() => import('./AIOrb').then((module) => ({ default: module.AIOrb })))

const floatingCards = [
  { label: 'AI Tutor', value: 'Explains anything', tone: 'brand' as const, x: '-8%', y: '18%', delay: 0 },
  { label: 'Quiz Gen', value: '12 questions ready', tone: 'cyan' as const, x: '82%', y: '12%', delay: 0.15 },
  { label: 'Progress', value: '+24% this week', tone: 'violet' as const, x: '86%', y: '64%', delay: 0.3 },
  { label: 'Flashcards', value: '48 mastered', tone: 'success' as const, x: '-6%', y: '70%', delay: 0.45 },
]

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  // Mouse-reactive lighting: track pointer, drive a radial highlight + subtle parallax.
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const glowX = useSpring(useTransform(mx, [0, 1], ['20%', '80%']), { stiffness: 80, damping: 20 })
  const glowY = useSpring(useTransform(my, [0, 1], ['20%', '80%']), { stiffness: 80, damping: 20 })
  const tiltX = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 60, damping: 18 })
  const tiltY = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 60, damping: 18 })
  const [renderOrb, setRenderOrb] = useState(false)
  const [enhancedVisuals] = useState(
    () =>
      !window.matchMedia('(max-width: 900px)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      !(
        'connection' in navigator &&
        (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
      )
  )

  useEffect(() => {
    if (!enhancedVisuals) return
    const handle = window.setTimeout(() => setRenderOrb(true), 8_000)
    return () => window.clearTimeout(handle)
  }, [enhancedVisuals])

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mx.set((e.clientX - rect.left) / rect.width)
    my.set((e.clientY - rect.top) / rect.height)
    if (enhancedVisuals && !renderOrb) setRenderOrb(true)
  }

  return (
    <section ref={ref} className={styles.hero} onMouseMove={onMove}>
      <motion.div
        aria-hidden
        className={styles.spotlight}
        style={{
          background: useTransform(
            [glowX, glowY],
            ([x, y]) => `radial-gradient(600px circle at ${x} ${y}, rgba(99,102,241,0.22), transparent 60%)`
          ),
        }}
      />

      <div className={styles.grid} />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <Badge tone="brand">
            <span className={styles.pulse} /> AI-powered learning, connected by design
          </Badge>

          <h1 className={styles.title}>
            Connecting Knowledge,
            <br />
            <span className="nx-gradient-text">Empowering Minds.</span>
          </h1>

          <p className={styles.subtitle}>
            Cognexa brings intelligent learning, course delivery, analytics, and collaboration into one
            premium workspace for institutions, instructors, enterprises, and ambitious learners.
          </p>

          <div className={styles.actions}>
            <a href="#catalog">
              <Button size="lg" magnetic>
                Explore Learning
              </Button>
            </a>
            <a href="#progress">
              <Button size="lg" variant="glass" magnetic>
                See Learner Experience
              </Button>
            </a>
          </div>

          <div className={styles.stats}>
            <Stat value="3" label="Role-aware workspaces" />
            <Stat value="24/7" label="Intelligent assistance" />
            <Stat value="1" label="Connected platform" />
          </div>
        </div>

        {enhancedVisuals && (
          <motion.div className={styles.orbWrap} style={{ rotateX: tiltX, rotateY: tiltY }}>
            <div className={styles.orbGlow} />
            <Suspense fallback={<div className={styles.orbFallback} />}>
              {renderOrb ? <AIOrb /> : <div className={styles.orbFallback} />}
            </Suspense>

            {floatingCards.map((card) => (
              <motion.div
                key={card.label}
                className={styles.floatCard}
                style={{ left: card.x, top: card.y }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
                transition={{
                  opacity: { delay: 0.6 + card.delay, duration: 0.5 },
                  scale: { delay: 0.6 + card.delay, duration: 0.5 },
                  y: { duration: 4 + card.delay, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                <Badge tone={card.tone}>{card.label}</Badge>
                <span className={styles.floatValue}>{card.value}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <div className={styles.scrollHint}>
        <span>Scroll to explore</span>
        <motion.span
          className={styles.scrollDot}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

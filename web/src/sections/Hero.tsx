import { Suspense, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { AIOrb } from './AIOrb'
import { Badge, Button } from '../design'
import { tokens } from '../design'
import styles from './Hero.module.css'

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

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mx.set((e.clientX - rect.left) / rect.width)
    my.set((e.clientY - rect.top) / rect.height)
  }

  return (
    <section ref={ref} className={styles.hero} onMouseMove={onMove}>
      <motion.div
        aria-hidden
        className={styles.spotlight}
        style={{ background: useTransform([glowX, glowY], ([x, y]) => `radial-gradient(600px circle at ${x} ${y}, rgba(99,102,241,0.22), transparent 60%)`) }}
      />

      <div className={styles.grid} />

      <div className={styles.inner}>
        <motion.div
          className={styles.copy}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: tokens.ease.out }}
        >
          <Badge tone="brand">
            <span className={styles.pulse} /> 🎮 Gamified AI Learning • Season 1 Live
          </Badge>

          <h1 className={styles.title}>
            Learn, Play, &
            <br />
            <span className="nx-gradient-text">Master the Future</span>
          </h1>

          <p className={styles.subtitle}>
            NEXUS AI turns complex engineering and robotics into an addictive, interactive game. Level up with your 24/7 AI Tutor, auto-generated quizzes, and live XP multipliers that make studying unforgettable.
          </p>

          <div className={styles.actions}>
            <a href="#catalog">
              <Button size="lg" magnetic>
                Explore Catalog 🚀
              </Button>
            </a>
            <a href="#progress">
              <Button size="lg" variant="glass" magnetic>
                Try XP Engine ⚡
              </Button>
            </a>
          </div>

          <div className={styles.stats}>
            <Stat value="14" label="AI Tools" />
            <Stat value="2,500+" label="Daily XP Quests" />
            <Stat value="99.4%" label="Completion Rate" />
          </div>
        </motion.div>

        <motion.div className={styles.orbWrap} style={{ rotateX: tiltX, rotateY: tiltY }}>
          <div className={styles.orbGlow} />
          <Suspense fallback={<div className={styles.orbFallback} />}>
            <AIOrb />
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

import { Badge, GlassCard, Reveal, RevealItem } from '../design'
import styles from './BrandStory.module.css'

const values = [
  {
    title: 'Human potential first',
    description: 'Technology should amplify the judgement, creativity, and care of learners and educators.',
  },
  {
    title: 'Clarity builds trust',
    description: 'Every workflow should feel calm, understandable, accessible, and worthy of important work.',
  },
  {
    title: 'Progress with purpose',
    description: 'We measure success through durable knowledge, confident teaching, and meaningful growth.',
  },
]

export function BrandStory() {
  return (
    <section className={styles.section} id="about" aria-labelledby="brand-story-title">
      <Reveal className={styles.intro}>
        <Badge tone="violet">About Cognexa</Badge>
        <h2 id="brand-story-title" className={styles.title}>
          Knowledge becomes powerful when it is <span className="nx-gradient-text">connected.</span>
        </h2>
        <p className={styles.lead}>
          Cognexa is a premium AI-powered learning platform built for modern institutions, educators,
          enterprises, and learners. It brings intelligent assistance, insight, and collaboration into a
          seamless environment designed for mastery.
        </p>
      </Reveal>

      <Reveal stagger className={styles.grid}>
        <RevealItem>
          <GlassCard className={styles.card} elevation="raised">
            <span className={styles.label}>Mission</span>
            <h3>Make high-quality knowledge easier to teach, discover, and master.</h3>
          </GlassCard>
        </RevealItem>
        <RevealItem>
          <GlassCard className={styles.card} elevation="raised">
            <span className={styles.label}>Vision</span>
            <h3>A world where every mind can reach the right knowledge at the right moment.</h3>
          </GlassCard>
        </RevealItem>
      </Reveal>

      <Reveal stagger className={styles.values}>
        {values.map((value) => (
          <RevealItem key={value.title}>
            <article className={styles.value}>
              <span className={styles.valueDot} aria-hidden="true" />
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  )
}

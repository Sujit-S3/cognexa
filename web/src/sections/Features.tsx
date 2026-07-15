import { GlassCard, Reveal, RevealItem, Badge } from '../design'
import styles from './Features.module.css'

const aiTools = [
  { icon: '🧠', title: 'AI Tutor', desc: 'A patient tutor that explains any concept at your level, on demand.' },
  { icon: '📝', title: 'Quiz Generator', desc: 'Turn any lecture or PDF into a graded quiz in seconds.' },
  { icon: '⚡', title: 'Flashcards', desc: 'Spaced-repetition decks generated from your notes automatically.' },
  { icon: '📄', title: 'PDF Chat', desc: 'Ask questions across your readings and get cited answers.' },
  { icon: '🎯', title: 'Progress Prediction', desc: 'Forecasts your grade trajectory and flags risk early.' },
  { icon: '🗺️', title: 'Learning Roadmap', desc: 'A personalized path that adapts as you master topics.' },
  { icon: '💬', title: 'Mock Interview', desc: 'Realistic voice interviews with instant, structured feedback.' },
  { icon: '🔍', title: 'AI Code Review', desc: 'Line-by-line review of your assignments with suggestions.' },
]

export function Features() {
  return (
    <section className={styles.section} id="features">
      <Reveal className={styles.header}>
        <Badge tone="cyan">The AI Experience</Badge>
        <h2 className={styles.title}>
          Fourteen tools. <span className="nx-gradient-text">One intelligent platform.</span>
        </h2>
        <p className={styles.lead}>
          Every part of NEXUS AI is built around a pluggable AI service layer — swap in any model,
          or run the built-in mock provider offline. Learning, generation, and feedback in one place.
        </p>
      </Reveal>

      <Reveal stagger className={styles.grid}>
        {aiTools.map((tool) => (
          <RevealItem key={tool.title}>
            <GlassCard interactive reflective elevation="raised" className={styles.card}>
              <span className={styles.icon}>{tool.icon}</span>
              <h3 className={styles.cardTitle}>{tool.title}</h3>
              <p className={styles.cardDesc}>{tool.desc}</p>
            </GlassCard>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  )
}

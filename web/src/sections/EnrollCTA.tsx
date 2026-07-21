import { useState } from 'react'
import { GlassCard, Reveal, Badge, Button } from '../design'
import styles from './EnrollCTA.module.css'

export function EnrollCTA() {
  const [email, setEmail] = useState('')
  const [enrolled, setEnrolled] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setEnrolled(true)
    }
  }

  return (
    <section className={styles.section} id="enroll">
      <Reveal>
        <GlassCard elevation="floating" glow className={styles.ctaCard}>
          <Badge tone="cyan">Start with Cognexa</Badge>

          <h2 className={styles.title}>
            Bring every learning journey into <span className="nx-gradient-text">one intelligent space.</span>
          </h2>

          <p className={styles.subtitle}>
            Create a focused environment for teaching, learning, assessment, and collaboration—supported by AI
            that strengthens human expertise rather than replacing it.
          </p>

          <div className={styles.perksRow}>
            <div className={styles.perk}>
              <span>⚡</span> Guided Learning
            </div>
            <div className={styles.perk}>
              <span>🤖</span> Secure AI Assistance
            </div>
            <div className={styles.perk}>
              <span>🎓</span> Mastery-Based Progress
            </div>
            <div className={styles.perk}>
              <span>🛡️</span> Privacy by Design
            </div>
          </div>

          {enrolled ? (
            <div className={styles.successMsg}>
              <span>🎉</span> Welcome to Cognexa. Your getting-started guide has been sent to {email}.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="email"
                required
                placeholder="Enter your email address..."
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" size="lg" magnetic className={styles.submitBtn}>
                Join Cognexa
              </Button>
            </form>
          )}
        </GlassCard>
      </Reveal>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <span className="nx-gradient-text">Cognexa</span> • Connecting Knowledge, Empowering Minds.
        </div>

        <div className={styles.footerLinks}>
          <a href="#catalog" className={styles.footerLink}>
            Catalog
          </a>
          <a href="#progress" className={styles.footerLink}>
            XP Engine
          </a>
          <a href="#features" className={styles.footerLink}>
            AI Tools
          </a>
          <a href="#testimonials" className={styles.footerLink}>
            Testimonials
          </a>
          <a href="#" className={styles.footerLink}>
            Privacy & Terms
          </a>
        </div>

        <div>© 2026 Cognexa. Intelligent learning for every mind.</div>
      </footer>
    </section>
  )
}

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
          <Badge tone="cyan">🎁 Instant 14-Day Pro Pass</Badge>
          
          <h2 className={styles.title}>
            Ready to experience the <span className="nx-gradient-text">Future of Education?</span>
          </h2>
          
          <p className={styles.subtitle}>
            Join over 15,000+ students leveling up their skills today. Enter your email below to instantly unlock
            full access to the AI Tutor, 3D Web sandboxes, and personalized career roadmaps.
          </p>

          <div className={styles.perksRow}>
            <div className={styles.perk}><span>⚡</span> Instant Access</div>
            <div className={styles.perk}><span>🤖</span> 14 AI Tools Included</div>
            <div className={styles.perk}><span>🎮</span> Gamified XP Rewards</div>
            <div className={styles.perk}><span>🛡️</span> Cancel Anytime</div>
          </div>

          {enrolled ? (
            <div className={styles.successMsg}>
              <span>🎉</span> Welcome aboard! Your 14-Day Pro Pass and setup guide have been sent to {email}.
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
                Enroll Free Now
              </Button>
            </form>
          )}
        </GlassCard>
      </Reveal>

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <span className="nx-gradient-text">NEXUS AI</span> • Gamified Education
        </div>
        
        <div className={styles.footerLinks}>
          <a href="#catalog" className={styles.footerLink}>Catalog</a>
          <a href="#progress" className={styles.footerLink}>XP Engine</a>
          <a href="#features" className={styles.footerLink}>AI Tools</a>
          <a href="#testimonials" className={styles.footerLink}>Testimonials</a>
          <a href="#" className={styles.footerLink}>Privacy & Terms</a>
        </div>

        <div>
          © 2026 NEXUS AI Platform. Built with React 19, Three.js & Framer Motion.
        </div>
      </footer>
    </section>
  )
}

import { useState } from 'react'
import { GlassCard, Reveal, RevealItem, Badge } from '../design'
import styles from './Testimonials.module.css'
import studentAvatarImg from '../assets/student_avatar.png'

interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  category: string
  avatar: string
}

const testimonials: Testimonial[] = [
  {
    id: '1',
    quote: 'NEXUS AI turned the hardest concepts in PyTorch and Neural Controllers into a game. The 24/7 AI Tutor explained matrix transformations in exactly the way my brain needed. I landed my AI engineering offer at Stripe after completing the robotics track!',
    name: 'Sarah Jenkins',
    role: 'AI Engineer @ Stripe (Career Switcher)',
    category: 'Career Switchers',
    avatar: studentAvatarImg,
  },
  {
    id: '2',
    quote: 'The gamified XP system is dangerously addictive. I maintained a 42-day study streak and built two production 3D web apps with Three.js. This feels like what education should have been for the last decade.',
    name: 'Marcus Thorne',
    role: 'CS Senior @ Stanford University',
    category: 'CS Students',
    avatar: studentAvatarImg,
  },
  {
    id: '3',
    quote: 'As a self-taught founder, I needed to learn full-stack architecture fast without drowning in boring lecture videos. The auto-generated quizzes and instant code review saved me hundreds of hours during our MVP launch.',
    name: 'Elena Rostova',
    role: 'Founder & Tech Lead @ OrbitAI',
    category: 'Founders',
    avatar: studentAvatarImg,
  },
]

const categories = ['All Stories', 'Career Switchers', 'CS Students', 'Founders']

export function Testimonials() {
  const [activeTab, setActiveTab] = useState('All Stories')

  const filtered =
    activeTab === 'All Stories'
      ? testimonials
      : testimonials.filter((t) => t.category === activeTab)

  return (
    <section className={styles.section} id="testimonials">
      <Reveal className={styles.header}>
        <Badge tone="pink">Student Success Stories</Badge>
        <h2 className={styles.title}>
          Loved by over <span className="nx-gradient-text">15,000+ Students</span>
        </h2>
        <p className={styles.subtitle}>
          Discover how NEXUS AI is helping engineers, researchers, and creators master the future of technology faster than ever before.
        </p>
      </Reveal>

      <div className={styles.filterTabs}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.tab} ${activeTab === cat ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <Reveal stagger className={styles.grid}>
        {filtered.map((item) => (
          <RevealItem key={item.id}>
            <GlassCard interactive reflective elevation="floating" className={styles.card}>
              <div className={styles.starsRow}>
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>

              <p className={styles.quote}>&ldquo;{item.quote}&rdquo;</p>

              <div className={styles.authorRow}>
                <img src={item.avatar} alt={item.name} className={styles.authorAvatar} />
                <div className={styles.authorInfo}>
                  <span className={styles.authorName}>{item.name}</span>
                  <span className={styles.authorRole}>{item.role}</span>
                </div>
              </div>
            </GlassCard>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  )
}

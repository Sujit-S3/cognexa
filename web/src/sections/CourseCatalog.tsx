import { useState } from 'react'
import { GlassCard, Reveal, RevealItem, Badge, Button } from '../design'
import styles from './CourseCatalog.module.css'
import aiRoboticsImg from '../assets/ai_robotics.png'
import webMasteryImg from '../assets/web_mastery.png'

interface Course {
  id: string
  title: string
  category: string
  desc: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  rating: string
  students: string
  duration: string
  xp: string
  image?: string
  colorBadge: 'brand' | 'cyan' | 'violet' | 'success'
}

const courses: Course[] = [
  {
    id: 'ai-101',
    title: 'Autonomous Robotics & Neural Networks',
    category: 'AI & Robotics',
    desc: 'Build, simulate, and deploy interactive AI agents and neural controllers from scratch using PyTorch and WebGL.',
    level: 'Advanced',
    rating: '4.9',
    students: '2,840',
    duration: '8 Weeks',
    xp: '+1,200 XP',
    image: aiRoboticsImg,
    colorBadge: 'brand',
  },
  {
    id: 'web-pro',
    title: 'Full-Stack 3D Web & Interactive Systems',
    category: 'Interactive Web',
    desc: 'Master React 19, Three.js, and Framer Motion to craft cinematic, high-performance web experiences that feel alive.',
    level: 'Intermediate',
    rating: '4.8',
    students: '4,120',
    duration: '6 Weeks',
    xp: '+950 XP',
    image: webMasteryImg,
    colorBadge: 'cyan',
  },
  {
    id: 'data-synth',
    title: 'Generative AI & LLM Fine-Tuning Lab',
    category: 'AI & Robotics',
    desc: 'Learn how to fine-tune custom transformers, build RAG pipelines, and integrate state-of-the-art AI into production.',
    level: 'Advanced',
    rating: '5.0',
    students: '1,930',
    duration: '7 Weeks',
    xp: '+1,500 XP',
    colorBadge: 'violet',
  },
  {
    id: 'ui-motion',
    title: 'Modern UI/UX & Micro-Animation Architecture',
    category: 'Creative Design',
    desc: 'Design token systems, glassmorphic interfaces, and spring physics interactions that wow users at first glance.',
    level: 'Beginner',
    rating: '4.9',
    students: '3,450',
    duration: '4 Weeks',
    xp: '+600 XP',
    colorBadge: 'success',
  },
  {
    id: 'quantum-cs',
    title: 'Quantum Computing & Algorithms Sandbox',
    category: 'Space & Deep Tech',
    desc: 'Explore quantum gates, superposition, and entanglement through gamified interactive circuit simulators.',
    level: 'Intermediate',
    rating: '4.7',
    students: '1,120',
    duration: '5 Weeks',
    xp: '+1,100 XP',
    colorBadge: 'cyan',
  },
  {
    id: 'game-engine',
    title: 'Game Mechanics & Physics Engine Design',
    category: 'Interactive Web',
    desc: 'Code custom collision detection, rigid body dynamics, and particle simulators in TypeScript and WebAssembly.',
    level: 'Intermediate',
    rating: '4.9',
    students: '2,610',
    duration: '6 Weeks',
    xp: '+1,000 XP',
    colorBadge: 'brand',
  },
]

const categories = ['All Courses', 'AI & Robotics', 'Interactive Web', 'Creative Design', 'Space & Deep Tech']

export function CourseCatalog() {
  const [activeCategory, setActiveCategory] = useState('All Courses')

  const filteredCourses =
    activeCategory === 'All Courses'
      ? courses
      : courses.filter((c) => c.category === activeCategory)

  return (
    <section className={styles.section} id="catalog">
      <Reveal className={styles.header}>
        <Badge tone="violet">Interactive Curriculum</Badge>
        <h2 className={styles.title}>
          Explore the <span className="nx-gradient-text">Course Catalog</span>
        </h2>
        <p className={styles.subtitle}>
          Every course is packed with live coding sandboxes, AI tutor assistance, and gamified XP progression.
          Choose your track and start leveling up today.
        </p>
      </Reveal>

      <div className={styles.tabs}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.tab} ${activeCategory === cat ? styles.tabActive : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <Reveal stagger className={styles.grid}>
        {filteredCourses.map((course) => (
          <RevealItem key={course.id}>
            <GlassCard interactive reflective elevation="raised" className={styles.card}>
              <div className={styles.banner}>
                {course.image ? (
                  <img src={course.image} alt={course.title} className={styles.bannerImg} />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'radial-gradient(circle at 70% 30%, rgba(168,85,247,0.3), rgba(99,102,241,0.1))',
                    }}
                  />
                )}
                <div className={styles.bannerOverlay} />
                <div className={styles.badgeWrap}>
                  <Badge tone={course.colorBadge}>{course.category}</Badge>
                  <span className={styles.levelTag}>{course.level}</span>
                </div>
                <div className={styles.ratingTag}>
                  <span>★</span> {course.rating}
                </div>
              </div>

              <div className={styles.content}>
                <h3 className={styles.courseTitle}>{course.title}</h3>
                <p className={styles.courseDesc}>{course.desc}</p>

                <div className={styles.metaRow}>
                  <div className={styles.metaItem}>
                    <span>👥</span> {course.students} students
                  </div>
                  <div className={styles.metaItem}>
                    <span>⏱️</span> {course.duration}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <Button size="sm" magnetic className={styles.btnExplore}>
                    Explore Course
                  </Button>
                  <div className={styles.xpBonus}>
                    <span>⚡</span> {course.xp}
                  </div>
                </div>
              </div>
            </GlassCard>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  )
}

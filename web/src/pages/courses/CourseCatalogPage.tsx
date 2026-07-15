import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesApi, type CourseView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './CourseCatalogPage.module.css'
import aiRoboticsImg from '../../assets/ai_robotics.png'
import webMasteryImg from '../../assets/web_mastery.png'

// ── Static fallback courses shown when backend returns empty ──────────────────
const DEMO_COURSES: CourseView[] = [
  {
    _id: 'demo-ai',
    name: 'AI & Robotics — Neural Control Systems',
    description:
      'Master reinforcement learning algorithms, inverse kinematics, and neural control pipelines using Python and custom shaders.',
    image: aiRoboticsImg,
    backgroundColor: '#6366f1',
    status: 'published',
    enrolled: false,
    modules: [{ title: 'Module 1: Kinematics', moduleItems: [] }, { title: 'Module 2: Neural Control', moduleItems: [] }],
  },
  {
    _id: 'demo-web',
    name: 'Web Mastery — 3D WebGL & React 19',
    description:
      'Build state-of-the-art interactive 3D web applications with custom GLSL shaders, Three.js physics, and React 19 server actions.',
    image: webMasteryImg,
    backgroundColor: '#ec4899',
    status: 'published',
    enrolled: false,
    modules: [{ title: 'Module 1: Foundations', moduleItems: [] }, { title: 'Module 2: Shaders', moduleItems: [] }],
  },
  {
    _id: 'demo-sys',
    name: 'Distributed Systems & Cloud Scale AI',
    description:
      'Architect multi-region Kubernetes clusters, Kafka streaming pipelines, and fault-tolerant inference servers.',
    backgroundColor: '#3b82f6',
    status: 'published',
    enrolled: false,
    modules: [{ title: 'Module 1: Consensus', moduleItems: [] }],
  },
  {
    _id: 'demo-data',
    name: 'Data Science & Bioinformatics',
    description:
      'End-to-end genomic variant analysis, AlphaFold database mining, and large-scale bioinformatics pipelines.',
    backgroundColor: '#10b981',
    status: 'published',
    enrolled: false,
    modules: [{ title: 'Module 1: Omics', moduleItems: [] }],
  },
]

const CATEGORIES = ['All', 'AI & Robotics', 'WebGL & Graphics', 'System Architecture', 'Data Science']

function matchesCategory(course: CourseView, cat: string): boolean {
  if (cat === 'All') return true
  const n = course.name.toLowerCase()
  if (cat === 'AI & Robotics') return n.includes('ai') || n.includes('robotic') || n.includes('neural')
  if (cat === 'WebGL & Graphics') return n.includes('web') || n.includes('3d') || n.includes('shader') || n.includes('webgl')
  if (cat === 'System Architecture') return n.includes('system') || n.includes('cloud') || n.includes('distributed')
  if (cat === 'Data Science') return n.includes('data') || n.includes('science') || n.includes('bioinformatics') || n.includes('omics')
  return true
}

export function CourseCatalogPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const { data: courses = [], isLoading } = useQuery<CourseView[]>({
    queryKey: ['courses'],
    queryFn: () => coursesApi.getAll(),
    enabled: isAuthenticated,
    placeholderData: [],
  })

  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => coursesApi.enroll(courseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  })

  const displayCourses = useMemo(() => {
    const base = courses.length > 0 ? courses : DEMO_COURSES
    return base.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
      return matchSearch && matchesCategory(c, category)
    })
  }, [courses, search, category])

  const handleAction = (courseId: string, enrolled: boolean) => {
    if (!isAuthenticated) { navigate('/auth/login'); return }
    if (enrolled) { navigate(`/courses/${courseId}`); return }
    if (courseId.startsWith('demo-')) { navigate(`/courses/${courseId}`); return }
    enrollMutation.mutate(courseId)
  }

  return (
    <div className={styles.container}>
      {/* Hero */}
      <GlassCard elevation="raised" glow className={styles.heroBanner}>
        <Badge tone="brand">⚡ Interactive Curriculum Catalog</Badge>
        <h1 className={styles.title}>Explore Next-Gen AI &amp; Tech Courses</h1>
        <p className={styles.subtitle}>
          Immerse yourself in world-class courses designed by industry architects. Build live projects,
          complete gamified quests, and level up your mastery.
        </p>
      </GlassCard>

      {/* Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.searchBox}>
          <span style={{ color: 'var(--nx-fg-muted)' }}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nx-fg-muted)' }} onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>
        <div className={styles.categories}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.catBtn} ${category === cat ? styles.catBtnActive : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
          Loading courses from NEXUS AI…
        </div>
      ) : displayCourses.length === 0 ? (
        <GlassCard style={{ padding: '60px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>No matching courses</h3>
          <p style={{ color: 'var(--nx-fg-muted)', marginBottom: '20px' }}>Try a different search or category.</p>
          <Button variant="secondary" onClick={() => { setSearch(''); setCategory('All') }}>Reset Filters</Button>
        </GlassCard>
      ) : (
        <Reveal className={styles.grid}>
          {displayCourses.map((course) => {
            const id = course._id || course.id || 'demo'
            return (
              <RevealItem key={id}>
                <GlassCard className={styles.card}>
                  {course.image && (
                    <img src={course.image} alt={course.name} className={styles.cardImage} />
                  )}
                  {!course.image && (
                    <div
                      className={styles.cardColorBg}
                      style={{ background: course.backgroundColor || '#6366f1' }}
                    >
                      <span style={{ fontSize: '2.5rem' }}>📚</span>
                    </div>
                  )}
                  <div className={styles.cardBody}>
                    <Badge tone={course.enrolled ? 'success' : 'cyan'} style={{ marginBottom: '8px' }}>
                      {course.enrolled ? 'ENROLLED ✓' : `${course.modules?.length ?? 2} Modules`}
                    </Badge>
                    <h3 className={styles.cardTitle}>{course.name}</h3>
                    <p className={styles.cardDesc}>{course.description ?? 'Hands-on interactive learning curriculum.'}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <div className={styles.metaRow}>
                      <span>🎓 Intermediate</span>
                      <span>⭐ 4.9</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      <Link to={`/courses/${id}`} style={{ flex: 1 }}>
                        <Button variant="secondary" style={{ width: '100%', padding: '11px', fontSize: '0.9rem' }}>
                          View Details
                        </Button>
                      </Link>
                      <Button
                        magnetic
                        glow={!course.enrolled}
                        tone={course.enrolled ? 'neutral' : 'brand'}
                        onClick={() => handleAction(id, course.enrolled)}
                        disabled={enrollMutation.isPending}
                        style={{ padding: '11px 18px', fontSize: '0.9rem' }}
                      >
                        {course.enrolled ? 'Continue ⚡' : 'Enroll 🚀'}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </RevealItem>
            )
          })}
        </Reveal>
      )}
    </div>
  )
}

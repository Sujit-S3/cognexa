import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesApi, type CourseView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './CourseCatalogPage.module.css'
import aiRoboticsImg from '../../assets/ai_robotics.png'
import webMasteryImg from '../../assets/web_mastery.png'

const CATEGORIES = ['All', 'AI & Robotics', 'WebGL & Graphics', 'System Architecture', 'Data Science']

export function CourseCatalogPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const { data: courses = [], isLoading } = useQuery<CourseView[]>({
    queryKey: ['courses'],
    queryFn: () => coursesApi.getAll(),
  })

  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => coursesApi.enroll(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  // Merge real courses with demo fallback items
  const displayCourses = useMemo(() => {
    const list = courses.length > 0 ? courses : [
      {
        _id: 'demo-ai',
        name: 'AI & Robotics — Neural Control Systems',
        description: 'Master reinforcement learning algorithms, inverse kinematics, and neural control pipelines using Python and custom shaders.',
        image: aiRoboticsImg,
        backgroundColor: '#6366f1',
        status: 'published' as const,
        enrolled: true,
        modules: [{ title: 'Module 1: Kinematics', moduleItems: [] }, { title: 'Module 2: Neural Control', moduleItems: [] }],
      },
      {
        _id: 'demo-web',
        name: 'Web Mastery — 3D WebGL & React 19',
        description: 'Build state-of-the-art interactive 3D web applications with custom GLSL shaders, Three.js physics, and React 19 server actions.',
        image: webMasteryImg,
        backgroundColor: '#ec4899',
        status: 'published' as const,
        enrolled: false,
        modules: [{ title: 'Module 1: Foundations', moduleItems: [] }, { title: 'Module 2: Shaders', moduleItems: [] }],
      },
      {
        _id: 'demo-sys',
        name: 'Distributed Systems & Cloud Scale AI',
        description: 'Architect multi-region Kubernetes clusters, Kafka streaming pipelines, and fault-tolerant inference servers.',
        backgroundColor: '#3b82f6',
        status: 'published' as const,
        enrolled: false,
        modules: [{ title: 'Module 1: Consensus', moduleItems: [] }],
      },
      {
        _id: 'demo-data',
        name: 'Data Science & High-Throughput Omics',
        description: 'End-to-end genomic variant analysis, AlphaFold database mining, and large-scale bioinformatics pipelines.',
        backgroundColor: '#10b981',
        status: 'published' as const,
        enrolled: false,
        modules: [{ title: 'Module 1: Omics 101', moduleItems: [] }],
      },
    ]

    return list.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
      if (!matchSearch) return false

      if (activeCategory === 'All') return true
      if (activeCategory === 'AI & Robotics') return c.name.toLowerCase().includes('ai') || c.name.toLowerCase().includes('robotics')
      if (activeCategory === 'WebGL & Graphics') return c.name.toLowerCase().includes('web') || c.name.toLowerCase().includes('3d') || c.name.toLowerCase().includes('shader')
      if (activeCategory === 'System Architecture') return c.name.toLowerCase().includes('system') || c.name.toLowerCase().includes('cloud')
      if (activeCategory === 'Data Science') return c.name.toLowerCase().includes('data') || c.name.toLowerCase().includes('omics')
      return true
    })
  }, [courses, searchQuery, activeCategory])

  const handleEnrollClick = (courseId: string, isEnrolled: boolean) => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    if (isEnrolled) {
      navigate(`/courses/${courseId}`)
    } else {
      if (courseId.startsWith('demo-')) {
        navigate(`/courses/${courseId}`)
      } else {
        enrollMutation.mutate(courseId)
      }
    }
  }

  return (
    <div className={styles.container}>
      {/* Hero Banner */}
      <GlassCard elevation="raised" glow className={styles.heroBanner}>
        <Badge tone="brand">⚡ Interactive Curriculum Catalog</Badge>
        <h1 className={styles.title}>Explore Next-Gen AI & Tech Courses</h1>
        <p className={styles.subtitle}>
          Immerse yourself in world-class courses designed by industry architects. Build live projects, complete gamified quests, and level up your mastery.
        </p>
      </GlassCard>

      {/* Controls Row: Search & Category Tabs */}
      <div className={styles.controlsRow}>
        <div className={styles.searchBox}>
          <span style={{ color: 'var(--nx-fg-muted)' }}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search courses by title, skill, or discipline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span style={{ cursor: 'pointer', color: 'var(--nx-fg-muted)' }} onClick={() => setSearchQuery('')}>
              ✕
            </span>
          )}
        </div>

        <div className={styles.categories}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.catBtn} ${activeCategory === cat ? styles.catBtnActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
          Syncing course catalog with NEXUS AI backend...
        </div>
      ) : displayCourses.length === 0 ? (
        <GlassCard style={{ padding: '60px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>No matching courses found</h3>
          <p style={{ color: 'var(--nx-fg-muted)', marginBottom: '20px' }}>Try adjusting your search query or category filter.</p>
          <Button variant="secondary" onClick={() => { setSearchQuery(''); setActiveCategory('All') }}>
            Reset Filters
          </Button>
        </GlassCard>
      ) : (
        <Reveal className={styles.grid}>
          {displayCourses.map((course) => {
            const courseId = course._id || course.id || 'demo'
            return (
              <RevealItem key={courseId}>
                <GlassCard className={styles.card}>
                  <div>
                    {course.image && (
                      <img src={course.image} alt={course.name} className={styles.cardImage} />
                    )}
                    <div className={styles.cardTop}>
                      <div>
                        <Badge tone={course.enrolled ? 'success' : 'cyan'} style={{ marginBottom: '10px' }}>
                          {course.enrolled ? 'ENROLLED ✓' : `${course.modules?.length || 2} Modules`}
                        </Badge>
                        <h3 className={styles.cardTitle}>{course.name}</h3>
                        <p className={styles.cardDesc}>{course.description || 'Hands-on interactive learning curriculum.'}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className={styles.metaRow}>
                      <span>🎓 Level: Intermediate</span>
                      <span>⭐ 4.9 (420 reviews)</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <Link to={`/courses/${courseId}`} style={{ flex: 1 }}>
                        <Button variant="secondary" style={{ width: '100%', padding: '11px', fontSize: '0.9rem' }}>
                          Syllabus →
                        </Button>
                      </Link>
                      <Button
                        magnetic
                        glow={!course.enrolled}
                        tone={course.enrolled ? 'neutral' : 'brand'}
                        onClick={() => handleEnrollClick(courseId, course.enrolled)}
                        disabled={enrollMutation.isPending}
                        style={{ padding: '11px 20px', fontSize: '0.9rem' }}
                      >
                        {course.enrolled ? 'Continue Study ⚡' : 'Enroll Now 🚀'}
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

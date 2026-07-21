import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesApi, type CourseView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './CourseDetailPage.module.css'
import aiRoboticsImg from '../../assets/ai_robotics.webp'
import webMasteryImg from '../../assets/web_mastery.webp'

// Demo fallback for when no backend data is available
const DEMO: Record<string, CourseView> = {
  'demo-ai': {
    _id: 'demo-ai',
    name: 'AI & Robotics — Neural Control Systems',
    description:
      'Comprehensive curriculum on reinforcement learning, real-time inverse kinematics, autonomous pathfinding, and neural control loops using Python and custom shaders.',
    image: aiRoboticsImg,
    backgroundColor: '#6366f1',
    status: 'published',
    enrolled: true,
    modules: [
      {
        title: 'Module 1: Kinematics & Spatial Rigid Bodies',
        moduleItems: [
          { title: '1.1 Forward vs Inverse Kinematics Theory', type: 'video', url: '#' },
          { title: '1.2 Python Lab: Jacobian Computation', type: 'file', url: '#' },
        ],
      },
      {
        title: 'Module 2: Reinforcement Learning & Q-Learning',
        moduleItems: [
          { title: '2.1 MDP & Policy Gradients', type: 'video', url: '#' },
          { title: '2.2 Neural Network Control Loop Simulation', type: 'video', url: '#' },
        ],
      },
    ],
  },
  'demo-web': {
    _id: 'demo-web',
    name: 'Web Mastery — 3D WebGL & React 19',
    description:
      'Master state-of-the-art interactive web development with custom GLSL shaders, Three.js physics loops, Framer Motion springs, and React 19 architecture.',
    image: webMasteryImg,
    backgroundColor: '#ec4899',
    status: 'published',
    enrolled: true,
    modules: [
      {
        title: 'Module 1: Three.js & WebGL Foundations',
        moduleItems: [
          { title: '1.1 Scene, Camera, and WebGLRenderer', type: 'video', url: '#' },
          { title: '1.2 Custom Geometry and PBR Materials', type: 'file', url: '#' },
        ],
      },
      {
        title: 'Module 2: Custom Shaders & GLSL Pipelines',
        moduleItems: [
          { title: '2.1 Vertex vs Fragment Shaders', type: 'video', url: '#' },
          { title: '2.2 Interactive Fluid & Ripple Shaders', type: 'video', url: '#' },
        ],
      },
    ],
  },
}

export function CourseDetailPage() {
  const { courseId = 'demo-ai' } = useParams<{ courseId: string }>()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true, 1: true })

  const isDemo = courseId.startsWith('demo-')

  const { data: fetchedCourse, isLoading } = useQuery<CourseView>({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getOne(courseId),
    enabled: !isDemo && isAuthenticated,
  })

  const enrollMutation = useMutation({
    mutationFn: () => coursesApi.enroll(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  const unEnrollMutation = useMutation({
    mutationFn: () => coursesApi.unEnroll(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  const course: CourseView = fetchedCourse ?? DEMO[courseId] ?? DEMO['demo-ai']

  const toggleModule = (idx: number) => setExpandedModules((prev) => ({ ...prev, [idx]: !prev[idx] }))

  const handleEnroll = () => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    if (course.enrolled) {
      if (!isDemo) unEnrollMutation.mutate()
    } else {
      if (!isDemo) enrollMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>Loading course…</div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Hero */}
      <GlassCard elevation="raised" glow className={styles.hero}>
        <div className={styles.heroText}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Badge tone="brand">⚡ Pro Curriculum</Badge>
            <Badge tone={course.enrolled ? 'success' : 'cyan'}>
              {course.enrolled ? 'Enrolled ✓' : 'Open Enrollment'}
            </Badge>
          </div>
          <h1 className={styles.title}>{course.name}</h1>
          <p className={styles.desc}>{course.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.9rem' }}>
            <span style={{ color: '#fff', fontWeight: 600 }}>👨‍🏫 Dr. Marcus Vance</span>
            <span style={{ color: 'var(--nx-fg-muted)' }}>•</span>
            <span style={{ color: 'var(--nx-accent-cyan)' }}>⭐ 4.9 (420 ratings)</span>
          </div>
        </div>

        <GlassCard className={styles.heroSide}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.88rem',
            }}
          >
            <span style={{ color: 'var(--nx-fg-muted)' }}>Access</span>
            <Badge tone={course.enrolled ? 'success' : 'brand'}>
              {course.enrolled ? 'Active' : 'Free Enrollment'}
            </Badge>
          </div>
          <Button
            magnetic
            glow
            tone={course.enrolled ? 'success' : 'brand'}
            onClick={handleEnroll}
            disabled={enrollMutation.isPending || unEnrollMutation.isPending}
            style={{ padding: '14px', width: '100%', fontSize: '1rem' }}
          >
            {course.enrolled ? 'Continue Learning ⚡' : 'Enroll Now 🚀'}
          </Button>
          {course.enrolled && !isDemo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unEnrollMutation.mutate()}
              style={{ color: 'var(--nx-fg-muted)', fontSize: '0.8rem', marginTop: '4px' }}
            >
              Un-enroll
            </Button>
          )}
        </GlassCard>
      </GlassCard>

      <div className={styles.gridTwo}>
        {/* Left — Syllabus */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📖 Course Syllabus</h2>
            <Badge tone="cyan">{course.modules?.length ?? 2} Modules</Badge>
          </div>
          <Reveal className={styles.syllabus}>
            {(course.modules ?? []).map((mod, modIdx) => {
              const expanded = expandedModules[modIdx]
              return (
                <RevealItem key={mod._id ?? modIdx}>
                  <GlassCard className={styles.moduleCard}>
                    <div className={styles.moduleTop} onClick={() => toggleModule(modIdx)}>
                      <div className={styles.moduleTitle}>
                        <span style={{ color: 'var(--nx-brand-400)', fontSize: '0.85rem' }}>
                          {expanded ? '▼' : '▶'}
                        </span>
                        <span>{mod.title}</span>
                      </div>
                      <Badge tone="neutral">{mod.moduleItems?.length ?? 2} Lectures</Badge>
                    </div>
                    {expanded && (
                      <div className={styles.itemsList}>
                        {(mod.moduleItems ?? []).map((item, itemIdx) => (
                          <div key={item._id ?? itemIdx} className={styles.itemRow}>
                            <div className={styles.itemLeft}>
                              <span>{item.type === 'video' ? '📺' : '📄'}</span>
                              <span>{item.title}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!isAuthenticated) {
                                  navigate('/auth/login')
                                  return
                                }
                                navigate(`/courses/${courseId}/learn/${item._id ?? 'lec-' + (itemIdx + 1)}`)
                              }}
                              style={{ color: 'var(--nx-accent-cyan)', fontWeight: 700, fontSize: '0.84rem' }}
                            >
                              {item.type === 'video' ? 'Watch →' : 'Open →'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </RevealItem>
              )
            })}
          </Reveal>
        </div>

        {/* Right — Objectives & Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard style={{ padding: '26px' }}>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1.15rem', marginBottom: '14px' }}>
              🎯 What You Will Master
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.9rem',
                color: '#fff',
              }}
            >
              {[
                'Build production-ready, scalable architectures from scratch',
                'Write clean, type-safe TypeScript and GLSL shader code',
                'Deploy scalable APIs with real-time state synchronization',
              ].map((item) => (
                <li key={item} style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: 'var(--nx-success)', flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard style={{ padding: '26px' }}>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1.15rem', marginBottom: '14px' }}>
              💬 Student Feedback
            </h3>
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '0.85rem',
                }}
              >
                <strong style={{ color: '#fff' }}>Alex R.</strong>
                <span style={{ color: 'var(--nx-accent-cyan)' }}>⭐⭐⭐⭐⭐</span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--nx-fg-muted)', lineHeight: 1.5 }}>
                "Best online course I've taken. The interactive labs and instant grading make learning so much
                faster!"
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

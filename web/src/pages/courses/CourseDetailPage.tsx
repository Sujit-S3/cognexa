import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesApi, type CourseView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './CourseDetailPage.module.css'
import aiRoboticsImg from '../../assets/ai_robotics.png'
import webMasteryImg from '../../assets/web_mastery.png'

export function CourseDetailPage() {
  const { courseId = 'demo-ai' } = useParams<{ courseId: string }>()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true, 1: true })

  const { data: fetchedCourse, isLoading } = useQuery<CourseView>({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getOne(courseId),
    enabled: !courseId.startsWith('demo-'),
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

  // Fallback demo details if demo course or backend loading
  const course: CourseView =
    fetchedCourse ||
    (courseId === 'demo-web'
      ? {
          _id: 'demo-web',
          name: 'Web Mastery — 3D WebGL & React 19',
          description:
            'Master state-of-the-art interactive web development. Dive deep into custom GLSL shaders, high-performance Three.js physics loops, Framer Motion springs, and React 19 architecture.',
          image: webMasteryImg,
          backgroundColor: '#ec4899',
          status: 'published',
          enrolled: true,
          modules: [
            {
              title: 'Module 1: Three.js & WebGL Foundations',
              moduleItems: [
                { title: '1.1 Setting up Scene, Camera, and WebGLRenderer', type: 'video', url: '#' },
                { title: '1.2 Custom Geometry and PBR Materials Lab', type: 'file', url: '#' },
              ],
            },
            {
              title: 'Module 2: Custom Shaders & GLSL Pipelines',
              moduleItems: [
                { title: '2.1 Vertex vs Fragment Shaders Fundamentals', type: 'video', url: '#' },
                { title: '2.2 Interactive Fluid & Ripple Shaders', type: 'video', url: '#' },
              ],
            },
          ],
        }
      : {
          _id: 'demo-ai',
          name: 'AI & Robotics — Neural Control Systems',
          description:
            'Comprehensive curriculum teaching reinforcement learning algorithms, real-time inverse kinematics, autonomous pathfinding, and neural control loops using Python and custom shaders.',
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
                { title: '2.1 Markov Decision Processes & Policy Gradients', type: 'video', url: '#' },
                { title: '2.2 Neural Network Control Loop Simulation', type: 'video', url: '#' },
              ],
            },
          ],
        })

  const toggleModule = (index: number) => {
    setExpandedModules((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleEnrollAction = () => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    if (course.enrolled) {
      if (!courseId.startsWith('demo-')) {
        unEnrollMutation.mutate()
      }
    } else {
      if (!courseId.startsWith('demo-')) {
        enrollMutation.mutate()
      }
    }
  }

  if (isLoading && !courseId.startsWith('demo-')) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
          Loading course curriculum from NEXUS AI...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Hero Banner */}
      <GlassCard elevation="raised" glow className={styles.hero}>
        <div className={styles.heroText}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Badge tone="brand">⚡ Pro Curriculum</Badge>
            <Badge tone={course.enrolled ? 'success' : 'cyan'}>
              {course.enrolled ? 'Enrolled Student ✓' : 'Open Enrollment'}
            </Badge>
          </div>
          <h1 className={styles.title}>{course.name}</h1>
          <p className={styles.desc}>{course.description}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>👨‍🏫 Instructor: Dr. Marcus Vance</span>
            <span style={{ color: 'var(--nx-fg-muted)' }}>•</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--nx-accent-cyan)' }}>⭐ 4.9 (420 ratings)</span>
          </div>
        </div>

        {/* Action Card */}
        <GlassCard className={styles.heroCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--nx-fg-muted)', fontSize: '0.9rem' }}>Status</span>
            <Badge tone={course.enrolled ? 'success' : 'brand'}>
              {course.enrolled ? 'Active Access' : 'Included with Pro'}
            </Badge>
          </div>

          <Button
            magnetic
            glow
            tone={course.enrolled ? 'success' : 'brand'}
            onClick={handleEnrollAction}
            disabled={enrollMutation.isPending || unEnrollMutation.isPending}
            style={{ padding: '14px', fontSize: '1rem', width: '100%' }}
          >
            {course.enrolled ? 'Continue Learning ⚡' : 'Enroll Now 🚀'}
          </Button>

          {course.enrolled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!courseId.startsWith('demo-')) unEnrollMutation.mutate()
              }}
              style={{ color: 'var(--nx-fg-muted)', fontSize: '0.8rem' }}
            >
              Un-enroll from course
            </Button>
          )}
        </GlassCard>
      </GlassCard>

      {/* Two Column Section */}
      <div className={styles.gridTwo}>
        {/* Left: Syllabus Accordion */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span>📖 Course Syllabus & Modules</span>
            </h2>
            <Badge tone="cyan">{course.modules?.length || 2} Modules</Badge>
          </div>

          <Reveal className={styles.syllabusList}>
            {(course.modules || []).map((mod, modIdx) => {
              const isExpanded = expandedModules[modIdx]
              return (
                <RevealItem key={mod._id || modIdx}>
                  <GlassCard className={styles.moduleCard}>
                    <div className={styles.moduleTop} onClick={() => toggleModule(modIdx)}>
                      <div className={styles.moduleTitle}>
                        <span style={{ color: 'var(--nx-brand-400)' }}>{isExpanded ? '▼' : '▶'}</span>
                        <span>{mod.title}</span>
                      </div>
                      <Badge tone="neutral">{mod.moduleItems?.length || 2} Lectures</Badge>
                    </div>

                    {isExpanded && (
                      <div className={styles.itemsList}>
                        {(mod.moduleItems || [
                          { title: '1.1 Introduction to Module Concepts', type: 'video' as const, url: '#' },
                          { title: '1.2 Hands-on Lab & Code Exercise', type: 'file' as const, url: '#' },
                        ]).map((item, itemIdx) => (
                          <div key={item._id || itemIdx} className={styles.itemRow}>
                            <div className={styles.itemLeft}>
                              <span style={{ fontSize: '1.1rem' }}>{item.type === 'video' ? '📺' : '📄'}</span>
                              <span>{item.title}</span>
                            </div>
                            <Button variant="ghost" size="sm" style={{ color: 'var(--nx-accent-cyan)', fontWeight: 700 }}>
                              {item.type === 'video' ? 'Watch Video →' : 'View File →'}
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

        {/* Right: Learning Objectives & Reviews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <GlassCard style={{ padding: '26px' }}>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
              🎯 What You Will Master
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem', color: '#fff' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--nx-success)' }}>✓</span>
                <span>Build production-ready, highly interactive web or AI architectures.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--nx-success)' }}>✓</span>
                <span>Write clean, type-safe TypeScript and GLSL shader code from scratch.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'var(--nx-success)' }}>✓</span>
                <span>Deploy scalable backend APIs with real-time state synchronization.</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard style={{ padding: '26px' }}>
            <h3 className={styles.sectionTitle} style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
              💬 Student Feedback
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#fff' }}>Alex R.</strong>
                  <span style={{ color: 'var(--nx-accent-cyan)' }}>⭐⭐⭐⭐⭐</span>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--nx-fg-muted)' }}>
                  "Best online course I have ever taken. The interactive labs and instant grading make learning so much faster!"
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

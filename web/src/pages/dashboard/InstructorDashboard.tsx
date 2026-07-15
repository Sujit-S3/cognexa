import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesApi, type CourseView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './InstructorDashboard.module.css'
import aiRoboticsImg from '../../assets/ai_robotics.png'
import webMasteryImg from '../../assets/web_mastery.png'

interface GradingSubmission {
  id: string
  studentName: string
  assignmentTitle: string
  submittedAt: string
  status: 'Pending Review' | 'Graded'
  grade?: string
}

export function InstructorDashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseView[]>({
    queryKey: ['courses'],
    queryFn: () => coursesApi.getAll(),
  })

  const createCourseMutation = useMutation({
    mutationFn: (payload: { courseName: string; description?: string }) => coursesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setShowCreateModal(false)
      setNewCourseName('')
      setNewCourseDesc('')
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'published' | 'archived' }) =>
      coursesApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })

  // Courses created by this instructor or fallback demo courses
  const instructorCourses = courses.filter((c) => c.privilege === 'instructor' || c.privilege === 'admin' || user?.role === 'instructor')
  const displayCourses =
    instructorCourses.length > 0
      ? instructorCourses
      : [
          {
            _id: 'demo-ai',
            name: 'AI & Robotics — Neural Control Systems',
            description: 'Comprehensive reinforcement learning curriculum with interactive Python & WebGL labs.',
            image: aiRoboticsImg,
            backgroundColor: '#6366f1',
            status: 'published' as const,
            enrolled: true,
            privilege: 'instructor' as const,
            modules: [{ title: 'Module 1: Kinematics', moduleItems: [] }, { title: 'Module 2: Neural Control', moduleItems: [] }],
          },
          {
            _id: 'demo-web',
            name: 'Web Mastery — 3D WebGL & React 19',
            description: 'Advanced frontend architecture teaching shaders, Three.js canvas physics, and custom tokens.',
            image: webMasteryImg,
            backgroundColor: '#ec4899',
            status: 'published' as const,
            enrolled: true,
            privilege: 'instructor' as const,
            modules: [{ title: 'Module 1: Foundations', moduleItems: [] }],
          },
        ]

  const [submissions, setSubmissions] = useState<GradingSubmission[]>([
    { id: 'sub-1', studentName: 'Elena Rostova', assignmentTitle: 'Inverse Kinematics Lab 3', submittedAt: '2 hours ago', status: 'Pending Review' },
    { id: 'sub-2', studentName: 'Marcus Vance', assignmentTitle: 'Custom GLSL Fragment Shader', submittedAt: '5 hours ago', status: 'Pending Review' },
    { id: 'sub-3', studentName: 'Aria Chen', assignmentTitle: 'React 19 Server Actions Quiz', submittedAt: '1 day ago', status: 'Graded', grade: '98 / 100' },
  ])

  const handleGradeSubmission = (id: string) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'Graded', grade: '95 / 100 🌟' } : s))
    )
  }

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!newCourseName.trim()) return
    createCourseMutation.mutate({ courseName: newCourseName, description: newCourseDesc })
  }

  return (
    <div className={styles.container}>
      {/* Header Banner */}
      <GlassCard elevation="raised" glow className={styles.headerBanner}>
        <div>
          <Badge tone="violet" style={{ marginBottom: '10px' }}>👨‍🏫 Instructor Control Center</Badge>
          <h1 className={styles.title}>Instructor Portal</h1>
          <p className={styles.subtitle}>
            Manage your courses, review student lab submissions, and publish interactive 3D curriculum.
          </p>
        </div>
        <div>
          <Button magnetic glow onClick={() => setShowCreateModal(true)} style={{ padding: '14px 24px', fontSize: '1rem' }}>
            + Create New Course ⚡
          </Button>
        </div>
      </GlassCard>

      {/* Metrics Grid */}
      <Reveal className={styles.statsGrid}>
        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Active Courses</span>
              <span>📚</span>
            </div>
            <div className={styles.statValue}>{displayCourses.length}</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Total Enrolled Students</span>
              <span>👥</span>
            </div>
            <div className={styles.statValue}>1,428</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Pending Submissions</span>
              <span>📝</span>
            </div>
            <div className={styles.statValue}>
              {submissions.filter((s) => s.status === 'Pending Review').length}
            </div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Average Student Rating</span>
              <span>⭐</span>
            </div>
            <div className={styles.statValue}>4.9 / 5.0</div>
          </GlassCard>
        </RevealItem>
      </Reveal>

      {/* Courses Section */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>🛠️ My Managed Courses</span>
          </h2>
        </div>

        {coursesLoading ? (
          <div style={{ padding: '40px', color: 'var(--nx-fg-muted)' }}>Loading instructor curriculum...</div>
        ) : (
          <div className={styles.coursesGrid}>
            {displayCourses.map((course) => {
              const courseId = course._id || course.id || 'demo'
              return (
                <GlassCard key={courseId} className={styles.courseCard}>
                  <div className={styles.courseTop}>
                    <div>
                      <Badge tone={course.status === 'published' ? 'success' : 'neutral'} style={{ marginBottom: '8px' }}>
                        {course.status.toUpperCase()}
                      </Badge>
                      <h3 className={styles.courseName}>{course.name}</h3>
                      <p className={styles.courseDesc}>{course.description || 'No description provided.'}</p>
                    </div>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: course.backgroundColor || '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0,
                      }}
                    >
                      🎓
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--nx-fg-muted)', marginBottom: '12px' }}>
                      Curriculum: <strong>{course.modules?.length || 2} Modules</strong>
                    </div>
                    <div className={styles.actionsRow}>
                      <Link to={`/courses/${courseId}`} style={{ flex: 1 }}>
                        <Button variant="secondary" size="sm" style={{ width: '100%' }}>
                          Curriculum & Modules
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            id: courseId,
                            status: course.status === 'published' ? 'archived' : 'published',
                          })
                        }
                      >
                        {course.status === 'published' ? 'Archive' : 'Publish'}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Student Grading Queue */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>📋 Student Grading & Review Queue</span>
          </h2>
          <Badge tone="cyan">{submissions.filter((s) => s.status === 'Pending Review').length} Action Required</Badge>
        </div>

        <div className={styles.gradingList}>
          {submissions.map((sub) => (
            <GlassCard key={sub.id} className={styles.gradingItem}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                  🧑‍💻
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{sub.studentName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--nx-fg-muted)' }}>{sub.assignmentTitle} • {sub.submittedAt}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {sub.status === 'Pending Review' ? (
                  <>
                    <Badge tone="brand">Pending Review</Badge>
                    <Button magnetic glow size="sm" onClick={() => handleGradeSubmission(sub.id)}>
                      Review & Award Grade (95%)
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge tone="success">{sub.grade}</Badge>
                    <span style={{ fontSize: '0.85rem', color: 'var(--nx-success)', fontWeight: 600 }}>Completed ✓</span>
                  </>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <GlassCard elevation="raised" glow className={styles.modalCard} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Create New Course</h2>
            <p style={{ color: 'var(--nx-fg-muted)', fontSize: '0.9rem', marginBottom: '22px' }}>
              Initialize a new interactive course curriculum inside NEXUS AI.
            </p>

            <form onSubmit={handleCreateSubmit}>
              <div className={styles.formField}>
                <label className={styles.label}>Course Title</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder="e.g. Quantum Computing & WebGL Shaders"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>Description</label>
                <textarea
                  rows={3}
                  className={styles.input}
                  placeholder="Provide a brief summary of what students will master..."
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button magnetic glow type="submit" disabled={createCourseMutation.isPending}>
                  {createCourseMutation.isPending ? 'Creating...' : 'Initialize Course 🚀'}
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  )
}

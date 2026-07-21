import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coursesApi, deadlinesApi, type CourseView, type DeadlineView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import { CertificateModal } from '../../components/certificates/CertificateModal'
import styles from './StudentDashboard.module.css'
import aiRoboticsImg from '../../assets/ai_robotics.webp'
import webMasteryImg from '../../assets/web_mastery.webp'

interface DailyQuest {
  id: number
  title: string
  xp: number
  completed: boolean
}

export function StudentDashboard() {
  const { user } = useAuthStore()
  const [selectedCertCourse, setSelectedCertCourse] = useState<string | null>(null)

  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseView[]>({
    queryKey: ['courses'],
    queryFn: () => coursesApi.getAll(),
  })

  const { data: deadlines = [], isLoading: deadlinesLoading } = useQuery<DeadlineView[]>({
    queryKey: ['deadlines'],
    queryFn: () => deadlinesApi.getDeadlines(),
  })

  // Enrolled courses from backend or fallback interactive demo courses
  const enrolledCourses = courses.filter((c) => c.enrolled)
  const displayCourses: CourseView[] =
    enrolledCourses.length > 0
      ? enrolledCourses
      : [
          {
            _id: 'demo-ai',
            name: 'AI & Robotics — Neural Control Systems',
            description:
              'Master reinforcement learning algorithms and real-time robotic kinematics with custom shaders.',
            image: aiRoboticsImg,
            backgroundColor: '#6366f1',
            status: 'published' as const,
            enrolled: true,
            modules: [
              { title: 'Module 1: Kinematics', moduleItems: [] },
              { title: 'Module 2: Neural Control', moduleItems: [] },
            ],
          },
          {
            _id: 'demo-web',
            name: 'Web Mastery — 3D WebGL & React 19',
            description:
              'Build state-of-the-art interactive 3D web applications with Three.js and custom Framer physics.',
            image: webMasteryImg,
            backgroundColor: '#ec4899',
            status: 'published' as const,
            enrolled: true,
            modules: [{ title: 'Module 1: Three.js Foundations', moduleItems: [] }],
          },
        ]

  // Fallback demo deadlines if none exist yet
  const displayDeadlines =
    deadlines.length > 0
      ? deadlines
      : [
          {
            title: 'Neural Control Lab Submission',
            deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
            type: 'Assignment' as const,
            assessmentId: 'mock-1',
            course: { name: 'AI & Robotics', id: 'demo-ai' },
          },
          {
            title: 'Midterm WebGL Shader Exam',
            deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
            type: 'Exam' as const,
            assessmentId: 'mock-2',
            course: { name: 'Web Mastery', id: 'demo-web' },
          },
        ]

  const [quests, setQuests] = useState<DailyQuest[]>([
    { id: 1, title: 'Complete 1 video lecture in AI & Robotics', xp: 150, completed: true },
    { id: 2, title: 'Pass the WebGL Shader Practice Quiz', xp: 200, completed: false },
    { id: 3, title: 'Check in with instructor or discussion forum', xp: 100, completed: false },
  ])

  const [totalXp, setTotalXp] = useState(2840)
  const xpForNextLevel = 3500
  const xpPercent = Math.min(100, Math.round((totalXp / xpForNextLevel) * 100))

  const handleToggleQuest = (id: number) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === id) {
          const nextState = !q.completed
          setTotalXp((xp) => (nextState ? xp + q.xp : xp - q.xp))
          return { ...q, completed: nextState }
        }
        return q
      })
    )
  }

  return (
    <div className={styles.container}>
      {/* Welcome & Level Banner */}
      <GlassCard elevation="raised" glow className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Badge tone="brand">Learning in progress</Badge>
            <Badge tone="success">🔥 7 Day Streak</Badge>
          </div>
          <h1 className={styles.title}>Welcome Back, {user?.name || 'Student'}! 🚀</h1>
          <p className={styles.subtitle}>
            You are currently ranked in the top <strong>4%</strong> of AI students this week. Keep up the
            momentum!
          </p>
        </div>

        <div className={styles.levelBox}>
          <div className={styles.levelTop}>
            <span>🎮 Level 14 AI Architect</span>
            <span>
              {totalXp} / {xpForNextLevel} XP
            </span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${xpPercent}%` }} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--nx-accent-cyan)', textAlign: 'right' }}>
            +{xpForNextLevel - totalXp} XP until Level 15 (2x AI Speed Multiplier)
          </div>
        </div>
      </GlassCard>

      {/* Live Metrics Grid */}
      <Reveal className={styles.statsGrid}>
        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Enrolled Courses</span>
              <span>📚</span>
            </div>
            <div className={styles.statValue}>{displayCourses.length}</div>
            <div className={styles.statTrend}>↑ Active in learning track</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Current Streak</span>
              <span>🔥</span>
            </div>
            <div className={styles.statValue}>7 Days</div>
            <div className={styles.statTrend}>↑ Personal best this month!</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Upcoming Deadlines</span>
              <span>⏰</span>
            </div>
            <div className={styles.statValue}>{displayDeadlines.length}</div>
            <div className={styles.statTrend}>Next due in 48 hours</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Total Study Hours</span>
              <span>⏱️</span>
            </div>
            <div className={styles.statValue}>34.5 hrs</div>
            <div className={styles.statTrend}>↑ +6.2 hrs vs last week</div>
          </GlassCard>
        </RevealItem>
      </Reveal>

      {/* Enrolled Courses & Daily Quests Two-Column Layout */}
      <div className={styles.gridTwo}>
        {/* Left Column: My Courses */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span>🎯 My Enrolled Courses</span>
            </h2>
            <Link to="/catalog">
              <Button variant="ghost" size="sm">
                Explore All Courses →
              </Button>
            </Link>
          </div>

          {coursesLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
              Syncing your Cognexa learning space...
            </div>
          ) : (
            <div className={styles.coursesGrid}>
              {displayCourses.map((course) => {
                const courseId = course._id || course.id || 'demo'
                return (
                  <GlassCard key={courseId} className={styles.courseCard}>
                    <div className={styles.courseTop}>
                      <div>
                        <Badge tone="cyan" style={{ marginBottom: '8px' }}>
                          {course.modules?.length || 2} Modules
                        </Badge>
                        <h3 className={styles.courseName}>{course.name}</h3>
                        <p className={styles.courseDesc}>
                          {course.description || 'Interactive AI study module'}
                        </p>
                      </div>
                      <div
                        className={styles.courseIcon}
                        style={{ background: course.backgroundColor || '#6366f1' }}
                      >
                        🧠
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          color: 'var(--nx-fg-muted)',
                        }}
                      >
                        <span>Progress</span>
                        <span style={{ color: '#fff', fontWeight: 700 }}>68%</span>
                      </div>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: '68%' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <Link to={`/courses/${courseId}`} style={{ flex: 1 }}>
                          <Button
                            magnetic
                            glow
                            style={{ width: '100%', padding: '10px', fontSize: '0.86rem' }}
                          >
                            Continue ⚡
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedCertCourse(course.name)}
                          style={{ padding: '10px 14px', fontSize: '0.84rem' }}
                        >
                          Certificate 🏆
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Quests & Deadlines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Daily Quests Box */}
          <GlassCard style={{ padding: '24px' }}>
            <div className={styles.sectionHeader} style={{ marginBottom: '16px' }}>
              <h3 className={styles.sectionTitle} style={{ fontSize: '1.2rem' }}>
                ⚡ Daily Study Quests
              </h3>
              <Badge tone="brand">
                +{quests.filter((q) => !q.completed).reduce((sum, q) => sum + q.xp, 0)} XP Avail
              </Badge>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {quests.map((q) => (
                <div
                  key={q.id}
                  onClick={() => handleToggleQuest(q.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: q.completed ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: q.completed
                      ? '1px solid rgba(52, 211, 153, 0.35)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: q.completed ? 'none' : '2px solid rgba(255,255,255,0.3)',
                        background: q.completed ? 'var(--nx-success)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                      }}
                    >
                      {q.completed && '✓'}
                    </div>
                    <span
                      style={{
                        fontSize: '0.9rem',
                        color: q.completed ? 'var(--nx-success)' : '#fff',
                        textDecoration: q.completed ? 'line-through' : 'none',
                      }}
                    >
                      {q.title}
                    </span>
                  </div>
                  <Badge tone={q.completed ? 'success' : 'brand'} style={{ fontSize: '0.75rem' }}>
                    +{q.xp} XP
                  </Badge>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Upcoming Deadlines Box */}
          <div>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle} style={{ fontSize: '1.2rem' }}>
                ⏰ Upcoming Deadlines
              </h3>
            </div>

            {deadlinesLoading ? (
              <div style={{ padding: '20px', color: 'var(--nx-fg-muted)' }}>Loading deadlines...</div>
            ) : (
              <div className={styles.deadlinesList}>
                {displayDeadlines.map((item, index) => {
                  const dateObj = new Date(item.deadline)
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Upcoming'

                  return (
                    <Link
                      key={index}
                      to={
                        item.type === 'Exam'
                          ? '/assessments/quizzes/mock-2'
                          : '/assessments/assignments/mock-1'
                      }
                      style={{ textDecoration: 'none' }}
                    >
                      <GlassCard className={styles.deadlineItem}>
                        <div className={styles.deadlineLeft}>
                          <div className={styles.deadlineIcon}>{item.type === 'Exam' ? '📝' : '💻'}</div>
                          <div>
                            <div className={styles.deadlineTitle}>{item.title}</div>
                            <div className={styles.deadlineCourse}>
                              {item.course?.name || 'Course Assignment'}
                            </div>
                          </div>
                        </div>
                        <Badge tone={item.type === 'Exam' ? 'pink' : 'violet'}>Due: {formattedDate}</Badge>
                      </GlassCard>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <CertificateModal
        isOpen={Boolean(selectedCertCourse)}
        onClose={() => setSelectedCertCourse(null)}
        courseName={selectedCertCourse || undefined}
      />
    </div>
  )
}

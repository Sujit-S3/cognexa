import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  certificatesApi,
  coursesApi,
  deadlinesApi,
  type CourseView,
  type DeadlineView,
} from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import { CertificateCard } from '../../components/certificates/CertificateCard'
import styles from './StudentDashboard.module.css'

export function StudentDashboard() {
  const { user } = useAuthStore()

  const {
    data: courses = [],
    isLoading: coursesLoading,
    isError: coursesFailed,
  } = useQuery<CourseView[]>({
    queryKey: ['courses'],
    queryFn: () => coursesApi.getAll(),
  })

  const {
    data: deadlines = [],
    isLoading: deadlinesLoading,
    isError: deadlinesFailed,
  } = useQuery<DeadlineView[]>({
    queryKey: ['deadlines'],
    queryFn: () => deadlinesApi.getDeadlines(),
  })

  const { data: achievements = [] } = useQuery({
    queryKey: ['certificates', 'mine'],
    queryFn: () => certificatesApi.getMine(),
  })

  const enrolledCourses = courses.filter((course) => course.enrolled)

  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <Badge tone="brand">Learning workspace</Badge>
          <h1 className={styles.title}>Welcome back, {user?.name || 'Student'}</h1>
          <p className={styles.subtitle}>
            Your dashboard shows only enrollment and deadline data stored by Cognexa.
          </p>
        </div>
      </GlassCard>

      <Reveal className={styles.statsGrid}>
        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Enrolled courses</span>
            </div>
            <div className={styles.statValue}>{coursesLoading ? '-' : enrolledCourses.length}</div>
            <div className={styles.statTrend}>Persisted enrollments</div>
          </GlassCard>
        </RevealItem>
        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Upcoming deadlines</span>
            </div>
            <div className={styles.statValue}>{deadlinesLoading ? '-' : deadlines.length}</div>
            <div className={styles.statTrend}>Scheduled assessments</div>
          </GlassCard>
        </RevealItem>
        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Certificates earned</span>
            </div>
            <div className={styles.statValue}>{achievements.length}</div>
            <div className={styles.statTrend}>Course completions</div>
          </GlassCard>
        </RevealItem>
      </Reveal>

      <div className={styles.gridTwo}>
        <section aria-labelledby="enrolled-courses-title">
          <div className={styles.sectionHeader}>
            <h2 id="enrolled-courses-title" className={styles.sectionTitle}>
              My enrolled courses
            </h2>
            <Link to="/catalog">
              <Button variant="ghost" size="sm">
                Explore courses
              </Button>
            </Link>
          </div>

          {coursesLoading ? (
            <p style={{ padding: '32px', color: 'var(--nx-fg-muted)' }}>Loading enrollments...</p>
          ) : coursesFailed ? (
            <GlassCard style={{ padding: '28px' }}>
              <p role="alert">Cognexa could not load your enrollments. Please try again.</p>
            </GlassCard>
          ) : enrolledCourses.length === 0 ? (
            <GlassCard style={{ padding: '28px' }}>
              <h3>No enrolled courses</h3>
              <p style={{ color: 'var(--nx-fg-muted)', marginTop: '8px' }}>
                Browse the catalog to enroll in a published course.
              </p>
            </GlassCard>
          ) : (
            <div className={styles.coursesGrid}>
              {enrolledCourses.map((course) => {
                const courseId = course._id || course.id
                return (
                  <GlassCard key={courseId || course.name} className={styles.courseCard}>
                    <div className={styles.courseTop}>
                      <div>
                        <Badge tone="cyan" style={{ marginBottom: '8px' }}>
                          {course.modules?.length ?? 0} modules
                        </Badge>
                        <h3 className={styles.courseName}>{course.name}</h3>
                        {course.description && <p className={styles.courseDesc}>{course.description}</p>}
                      </div>
                    </div>
                    {course.progress && (
                      <div
                        role="status"
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${course.progress.percent}%`,
                              borderRadius: '999px',
                              background: 'var(--nx-accent-cyan)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--nx-fg-muted)' }}>
                          {course.progress.percent}%
                        </span>
                      </div>
                    )}
                    {courseId && (
                      <Link to={`/courses/${courseId}`}>
                        <Button magnetic style={{ width: '100%' }}>
                          View course
                        </Button>
                      </Link>
                    )}
                  </GlassCard>
                )
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="deadlines-title">
          <div className={styles.sectionHeader}>
            <h2 id="deadlines-title" className={styles.sectionTitle}>
              Upcoming deadlines
            </h2>
          </div>
          {deadlinesLoading ? (
            <p style={{ padding: '20px', color: 'var(--nx-fg-muted)' }}>Loading deadlines...</p>
          ) : deadlinesFailed ? (
            <GlassCard style={{ padding: '28px' }}>
              <p role="alert">Cognexa could not load your deadlines. Please try again.</p>
            </GlassCard>
          ) : deadlines.length === 0 ? (
            <GlassCard style={{ padding: '28px' }}>
              <p style={{ color: 'var(--nx-fg-muted)' }}>No upcoming deadlines.</p>
            </GlassCard>
          ) : (
            <div className={styles.deadlinesList}>
              {deadlines.map((item) => {
                const date = new Date(item.deadline)
                const formattedDate = Number.isNaN(date.getTime())
                  ? 'Date unavailable'
                  : date.toLocaleString()
                const assessmentPath =
                  item.kind === 'quiz'
                    ? `/assessments/quizzes/${item.course.id}/${item.assessmentId}`
                    : `/assessments/assignments/${item.course.id}/${item.assessmentId}`

                return (
                  <Link
                    key={`${item.assessmentId}-${item.deadline}`}
                    to={assessmentPath}
                    style={{ textDecoration: 'none' }}
                  >
                    <GlassCard className={styles.deadlineItem}>
                      <div className={styles.deadlineLeft}>
                        <div>
                          <div className={styles.deadlineTitle}>{item.title}</div>
                          <div className={styles.deadlineCourse}>
                            {item.course?.name || 'Course assessment'}
                          </div>
                        </div>
                      </div>
                      <Badge tone={item.kind === 'quiz' ? 'pink' : 'violet'}>{formattedDate}</Badge>
                    </GlassCard>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {achievements.length > 0 && (
        <section aria-labelledby="certificates-title">
          <div className={styles.sectionHeader}>
            <h2 id="certificates-title" className={styles.sectionTitle}>
              My certificates
            </h2>
          </div>
          <div className={styles.coursesGrid}>
            {achievements.map((achievement) => (
              <CertificateCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Coins,
  FileCheck2,
  GraduationCap,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { instructorApi, type CourseStatus } from '../../services/api'
import { Badge, Button, GlassCard, Reveal, RevealItem } from '../../design'
import { useAuthStore } from '../../stores/authStore'
import styles from './InstructorDashboard.module.css'

const statusTone: Record<CourseStatus, 'neutral' | 'cyan' | 'success' | 'violet'> = {
  draft: 'neutral',
  review: 'cyan',
  published: 'success',
  archived: 'violet',
}

function formatDate(value?: string) {
  if (!value) return 'Recently'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

export function InstructorDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const dashboard = useQuery({
    queryKey: ['instructor', 'dashboard'],
    queryFn: instructorApi.getDashboard,
  })

  const createCourse = useMutation({
    mutationFn: () => instructorApi.createDraft(),
    onSuccess: (course) => {
      void queryClient.invalidateQueries({ queryKey: ['instructor', 'dashboard'] })
      navigate(`/instructor/courses/${course._id ?? course.id}/edit`)
    },
  })

  const archiveCourse = useMutation({
    mutationFn: ({ courseId, status }: { courseId: string; status: CourseStatus }) =>
      instructorApi.transitionStatus(courseId, status),
    onMutate: async ({ courseId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['instructor', 'dashboard'] })
      const previous = queryClient.getQueryData(['instructor', 'dashboard'])
      queryClient.setQueryData(['instructor', 'dashboard'], (current: typeof dashboard.data) =>
        current
          ? {
              ...current,
              courses: current.courses.map((course) =>
                (course._id ?? course.id) === courseId ? { ...course, status } : course
              ),
            }
          : current
      )
      return { previous }
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(['instructor', 'dashboard'], context?.previous),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['instructor', 'dashboard'] }),
  })

  if (dashboard.isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeletonHeader} />
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className={styles.skeletonPanel} role="status">
          Loading instructor analytics…
        </div>
      </div>
    )
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <div className={styles.container}>
        <GlassCard className={styles.errorState}>
          <h1>Instructor workspace unavailable</h1>
          <p>{dashboard.error?.message ?? 'The workspace could not be loaded.'}</p>
          <Button type="button" onClick={() => void dashboard.refetch()}>
            Try again
          </Button>
        </GlassCard>
      </div>
    )
  }

  const data = dashboard.data
  const metrics = [
    {
      label: 'Managed courses',
      value: data.summary.courseCount,
      detail: `${data.summary.publishedCourseCount} published`,
      icon: BookOpen,
    },
    {
      label: 'Enrolled learners',
      value: data.summary.totalStudents,
      detail: 'Across your courses',
      icon: Users,
    },
    {
      label: 'Completion rate',
      value: `${data.summary.completionRate}%`,
      detail: 'Achievement-based',
      icon: CheckCircle2,
    },
    {
      label: 'Pending submissions',
      value: data.summary.pendingSubmissions,
      detail: 'Awaiting review',
      icon: FileCheck2,
    },
  ]

  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.headerBanner}>
        <div>
          <Badge tone="violet">
            <Sparkles size={13} /> Instructor workspace
          </Badge>
          <h1>Welcome back, {user?.name?.split(' ')[0] ?? 'Instructor'}.</h1>
          <p>Create courses, shape curriculum, publish confidently, and monitor learner outcomes.</p>
        </div>
        <Button
          magnetic
          glow
          leftIcon={<Plus size={18} />}
          disabled={createCourse.isPending}
          onClick={() => createCourse.mutate()}
        >
          {createCourse.isPending ? 'Creating draft…' : 'Create course'}
        </Button>
      </GlassCard>
      {createCourse.isError && (
        <div className={styles.inlineError} role="alert">
          {createCourse.error.message}
        </div>
      )}

      <Reveal className={styles.statsGrid}>
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <RevealItem key={metric.label}>
              <GlassCard className={styles.statCard}>
                <div className={styles.statIcon}>
                  <Icon size={19} />
                </div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </GlassCard>
            </RevealItem>
          )
        })}
      </Reveal>

      <div className={styles.contentGrid}>
        <section className={styles.primaryColumn} aria-labelledby="managed-courses-heading">
          <div className={styles.sectionHeader}>
            <div>
              <Badge tone="cyan">Course management</Badge>
              <h2 id="managed-courses-heading">Your courses</h2>
            </div>
            <span>{data.courses.length} total</span>
          </div>
          {data.courses.length === 0 ? (
            <GlassCard className={styles.emptyState}>
              <GraduationCap size={32} />
              <h3>Your first course starts here</h3>
              <p>Create a persisted draft, then build every detail from the workspace.</p>
              <Button type="button" onClick={() => createCourse.mutate()}>
                Create first course
              </Button>
            </GlassCard>
          ) : (
            <div className={styles.coursesGrid}>
              {data.courses.map((course) => {
                const id = course._id ?? course.id ?? ''
                const analytics = course.analytics
                return (
                  <GlassCard key={id} interactive className={styles.courseCard}>
                    <div className={styles.courseVisual}>
                      {course.thumbnail?.url || course.image ? (
                        <img src={course.thumbnail?.url ?? course.image} alt="" />
                      ) : (
                        <BookOpen size={24} />
                      )}
                    </div>
                    <div className={styles.courseBody}>
                      <div className={styles.courseTop}>
                        <Badge tone={statusTone[course.status]}>{course.status}</Badge>
                        <span>
                          {course.updatedAt
                            ? `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(course.updatedAt))}`
                            : 'New draft'}
                        </span>
                      </div>
                      <h3>{course.name}</h3>
                      <p>{course.description || 'Add a course description in the setup wizard.'}</p>
                      <div className={styles.courseMetrics}>
                        <span>
                          <Users size={14} /> {analytics?.studentCount ?? 0}
                        </span>
                        <span>
                          <BookOpen size={14} /> {analytics?.lessonCount ?? 0} lessons
                        </span>
                        <span>
                          <TrendingUp size={14} /> {analytics?.completionRate ?? 0}% complete
                        </span>
                      </div>
                      <div className={styles.courseActions}>
                        <Link to={`/instructor/courses/${id}/edit`}>
                          Open builder <ArrowRight size={15} />
                        </Link>
                        <button
                          type="button"
                          disabled={archiveCourse.isPending}
                          onClick={() =>
                            archiveCourse.mutate({
                              courseId: id,
                              status: course.status === 'archived' ? 'draft' : 'archived',
                            })
                          }
                        >
                          {course.status === 'archived' ? (
                            <>
                              <RotateCcw size={15} /> Restore
                            </>
                          ) : (
                            <>
                              <Archive size={15} /> Archive
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </section>

        <aside className={styles.sideColumn}>
          <GlassCard className={styles.revenueCard}>
            <div>
              <span>Revenue</span>
              <Coins size={20} />
            </div>
            <strong>—</strong>
            <p>Connect a payment provider to activate revenue analytics.</p>
            <Badge tone="neutral">Not configured</Badge>
          </GlassCard>
          <GlassCard className={styles.activityCard}>
            <div className={styles.cardHeading}>
              <h2>Recent activity</h2>
              <Clock3 size={18} />
            </div>
            {data.recentActivity.length === 0 ? (
              <p className={styles.muted}>Submission activity will appear here.</p>
            ) : (
              <ul>
                {data.recentActivity.slice(0, 6).map((activity) => (
                  <li key={activity.id}>
                    <span>{activity.studentName.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{activity.studentName}</strong>
                      <p>Submitted {activity.assessmentTitle}</p>
                      <small>{formatDate(activity.occurredAt)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </aside>
      </div>

      <div className={styles.analyticsGrid}>
        <GlassCard className={styles.analyticsPanel}>
          <div className={styles.cardHeading}>
            <h2>Top performing courses</h2>
            <TrendingUp size={18} />
          </div>
          {data.topCourses.length === 0 ? (
            <p className={styles.muted}>Publish and enroll learners to see course performance.</p>
          ) : (
            <div className={styles.performanceList}>
              {data.topCourses.map((course, index) => (
                <div key={course.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{course.name}</strong>
                    <small>
                      {course.studentCount} learners · {course.lessonCount} lessons
                    </small>
                  </div>
                  <b>{course.completionRate}%</b>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
        <GlassCard className={styles.analyticsPanel}>
          <div className={styles.cardHeading}>
            <h2>Recent learners</h2>
            <Users size={18} />
          </div>
          {data.students.length === 0 ? (
            <p className={styles.muted}>Enrolled learners will appear here.</p>
          ) : (
            <div className={styles.studentList}>
              {data.students.slice(0, 7).map((student) => (
                <div key={`${student.id}-${student.course.id}`}>
                  <div className={styles.avatar}>
                    {student.photo ? (
                      <img src={student.photo} alt="" />
                    ) : (
                      student.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <span>
                    <strong>{student.name}</strong>
                    <small>{student.course.name}</small>
                  </span>
                  <Badge tone={student.completed ? 'success' : 'neutral'}>
                    {student.completed ? 'Completed' : 'Learning'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coursesApi, type CourseView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './CourseDetailPage.module.css'

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true })

  const {
    data: course,
    isLoading,
    isError,
  } = useQuery<CourseView>({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getOne(courseId!),
    enabled: Boolean(courseId),
  })

  const refreshCourseQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
      queryClient.invalidateQueries({ queryKey: ['courses'] }),
    ])
  }

  const enrollMutation = useMutation({
    mutationFn: () => coursesApi.enroll(courseId!),
    onSuccess: refreshCourseQueries,
  })

  const unEnrollMutation = useMutation({
    mutationFn: () => coursesApi.unEnroll(courseId!),
    onSuccess: refreshCourseQueries,
  })

  const toggleModule = (index: number) =>
    setExpandedModules((previous) => ({ ...previous, [index]: !previous[index] }))

  const handleEnrollment = () => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    if (course?.enrolled) {
      unEnrollMutation.mutate()
    } else {
      enrollMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div role="status" style={{ padding: '80px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
        Loading course...
      </div>
    )
  }

  if (isError || !course) {
    return (
      <div className={styles.container}>
        <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
          <h1>Course unavailable</h1>
          <p role="alert" style={{ color: 'var(--nx-fg-muted)', marginTop: '12px' }}>
            This course does not exist, is not published, or cannot be loaded right now.
          </p>
          <Button style={{ marginTop: '24px' }} onClick={() => navigate('/catalog')}>
            Return to catalog
          </Button>
        </GlassCard>
      </div>
    )
  }

  const enrollmentPending = enrollMutation.isPending || unEnrollMutation.isPending
  const enrollmentFailed = enrollMutation.isError || unEnrollMutation.isError

  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.hero}>
        <div className={styles.heroText}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Badge tone="brand">{course.status}</Badge>
            <Badge tone={course.enrolled ? 'success' : 'cyan'}>
              {course.enrolled ? 'Enrolled' : 'Open enrollment'}
            </Badge>
          </div>
          <h1 className={styles.title}>{course.name}</h1>
          {course.description && <p className={styles.desc}>{course.description}</p>}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', color: 'var(--nx-fg-muted)' }}>
            {course.createdBy?.name && <span>Instructor: {course.createdBy.name}</span>}
            {course.level && <span>Level: {course.level}</span>}
            {course.language && <span>Language: {course.language}</span>}
          </div>
        </div>

        <GlassCard className={styles.heroSide}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--nx-fg-muted)' }}>Access</span>
            <Badge tone={course.enrolled ? 'success' : 'brand'}>
              {course.enrolled ? 'Active' : course.pricing?.model === 'paid' ? 'Paid' : 'Free'}
            </Badge>
          </div>
          <Button
            magnetic
            glow
            tone={course.enrolled ? 'neutral' : 'brand'}
            onClick={handleEnrollment}
            disabled={enrollmentPending}
            style={{ padding: '14px', width: '100%', fontSize: '1rem' }}
          >
            {enrollmentPending ? 'Updating...' : course.enrolled ? 'Un-enroll' : 'Enroll'}
          </Button>
          {enrollmentFailed && (
            <p role="alert" style={{ color: 'var(--nx-danger)', fontSize: '0.85rem' }}>
              Enrollment could not be updated. Please try again.
            </p>
          )}
        </GlassCard>
      </GlassCard>

      <div className={styles.gridTwo}>
        <section aria-labelledby="course-syllabus-title">
          <div className={styles.sectionHeader}>
            <h2 id="course-syllabus-title" className={styles.sectionTitle}>
              Course syllabus
            </h2>
            <Badge tone="cyan">{course.modules?.length ?? 0} modules</Badge>
          </div>
          {!course.modules?.length ? (
            <GlassCard style={{ padding: '28px' }}>
              <p style={{ color: 'var(--nx-fg-muted)' }}>No published modules are available.</p>
            </GlassCard>
          ) : (
            <Reveal className={styles.syllabus}>
              {course.modules.map((module, moduleIndex) => {
                const expanded = expandedModules[moduleIndex]
                return (
                  <RevealItem key={module._id ?? module.id ?? moduleIndex}>
                    <GlassCard className={styles.moduleCard}>
                      <button
                        type="button"
                        className={styles.moduleTop}
                        aria-expanded={Boolean(expanded)}
                        onClick={() => toggleModule(moduleIndex)}
                        style={{ width: '100%', border: 0, background: 'transparent' }}
                      >
                        <span className={styles.moduleTitle}>{module.title}</span>
                        <Badge tone="neutral">{module.moduleItems?.length ?? 0} items</Badge>
                      </button>
                      {expanded && (
                        <div className={styles.itemsList}>
                          {(module.moduleItems ?? []).map((item, itemIndex) => (
                            <div key={item._id ?? item.id ?? itemIndex} className={styles.itemRow}>
                              <div className={styles.itemLeft}>
                                <span>{item.title}</span>
                              </div>
                              <Badge tone="neutral">{item.type}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  </RevealItem>
                )
              })}
            </Reveal>
          )}
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard style={{ padding: '26px' }}>
            <h2 className={styles.sectionTitle} style={{ fontSize: '1.15rem', marginBottom: '14px' }}>
              Course information
            </h2>
            <dl style={{ display: 'grid', gap: '12px', color: 'var(--nx-fg-muted)' }}>
              <div>
                <dt>Duration</dt>
                <dd>{course.durationMinutes ? `${course.durationMinutes} minutes` : 'Not specified'}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{course.category || 'Not specified'}</dd>
              </div>
            </dl>
          </GlassCard>

          {course.prerequisites && course.prerequisites.length > 0 && (
            <GlassCard style={{ padding: '26px' }}>
              <h2 className={styles.sectionTitle} style={{ fontSize: '1.15rem', marginBottom: '14px' }}>
                Prerequisites
              </h2>
              <ul style={{ paddingLeft: '20px', color: 'var(--nx-fg-muted)', lineHeight: 1.7 }}>
                {course.prerequisites.map((prerequisite) => (
                  <li key={prerequisite}>{prerequisite}</li>
                ))}
              </ul>
            </GlassCard>
          )}
        </aside>
      </div>
    </div>
  )
}

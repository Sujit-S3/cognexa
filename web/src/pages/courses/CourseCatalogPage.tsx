import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { coursesApi, type CourseView } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './CourseCatalogPage.module.css'

export function CourseCatalogPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const {
    data: courses = [],
    isLoading,
    isError,
  } = useQuery<CourseView[]>({
    queryKey: ['courses'],
    queryFn: () => coursesApi.getAll(),
    placeholderData: [],
  })

  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => coursesApi.enroll(courseId),
    onSuccess: (_data, courseId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['courses'] }),
        // A learner who previously viewed this course's detail page (before enrolling from the
        // catalog card here) would otherwise keep seeing the pre-enrollment "Enroll" state there
        // until that cached query went stale on its own.
        queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['deadlines'] }),
      ]),
  })

  const categories = useMemo(
    () => ['All', ...new Set(courses.map((course) => course.category).filter(Boolean) as string[])],
    [courses]
  )

  const displayCourses = useMemo(
    () =>
      courses.filter((course) => {
        const normalizedSearch = search.trim().toLowerCase()
        const matchesSearch =
          course.name.toLowerCase().includes(normalizedSearch) ||
          (course.description?.toLowerCase().includes(normalizedSearch) ?? false)
        return matchesSearch && (category === 'All' || course.category === category)
      }),
    [courses, search, category]
  )

  const handleAction = (courseId: string, enrolled: boolean) => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    if (enrolled) {
      navigate(`/courses/${courseId}`)
      return
    }
    enrollMutation.mutate(courseId)
  }

  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.heroBanner}>
        <Badge tone="brand">Published curriculum</Badge>
        <h1 className={styles.title}>Explore Cognexa courses</h1>
        <p className={styles.subtitle}>
          Browse the current course catalog and enroll in published learning programs.
        </p>
      </GlassCard>

      <div className={styles.controlsRow}>
        <div className={styles.searchBox}>
          <span aria-hidden="true">Search</span>
          <input
            type="search"
            aria-label="Search courses"
            className={styles.searchInput}
            placeholder="Search courses"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear course search"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nx-fg-muted)' }}
              onClick={() => setSearch('')}
            >
              Clear
            </button>
          )}
        </div>
        {categories.length > 1 && (
          <div className={styles.categories} aria-label="Course categories">
            {categories.map((courseCategory) => (
              <button
                type="button"
                key={courseCategory}
                className={`${styles.catBtn} ${category === courseCategory ? styles.catBtnActive : ''}`}
                onClick={() => setCategory(courseCategory)}
              >
                {courseCategory}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div role="status" style={{ padding: '60px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
          Loading courses...
        </div>
      ) : isError ? (
        <GlassCard style={{ padding: '60px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            Course catalog unavailable
          </h2>
          <p role="alert" style={{ color: 'var(--nx-fg-muted)' }}>
            Cognexa could not load the published course catalog. Please try again.
          </p>
        </GlassCard>
      ) : displayCourses.length === 0 ? (
        <GlassCard style={{ padding: '60px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            No matching courses
          </h2>
          <p style={{ color: 'var(--nx-fg-muted)', marginBottom: '20px' }}>
            {courses.length === 0
              ? 'No published courses are available yet.'
              : 'Try a different search or category.'}
          </p>
          {courses.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setCategory('All')
              }}
            >
              Reset filters
            </Button>
          )}
        </GlassCard>
      ) : (
        <Reveal className={styles.grid}>
          {displayCourses.map((course) => {
            const id = course._id || course.id
            if (!id) return null
            return (
              <RevealItem key={id}>
                <GlassCard className={styles.card}>
                  {course.image ? (
                    <img src={course.image} alt="" className={styles.cardImage} />
                  ) : (
                    <div
                      className={styles.cardColorBg}
                      style={{ background: course.backgroundColor || '#6366f1' }}
                    />
                  )}
                  <div className={styles.cardBody}>
                    <Badge tone={course.enrolled ? 'success' : 'cyan'} style={{ marginBottom: '8px' }}>
                      {course.enrolled ? 'Enrolled' : `${course.modules?.length ?? 0} modules`}
                    </Badge>
                    <h2 className={styles.cardTitle}>{course.name}</h2>
                    <p className={styles.cardDesc}>
                      {course.description || 'Course description not provided.'}
                    </p>
                  </div>
                  <div className={styles.cardFooter}>
                    <div className={styles.metaRow}>
                      <span>{course.level ? `Level: ${course.level}` : 'Self-paced course'}</span>
                      {course.createdBy?.name && <span>By {course.createdBy.name}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      <Link to={`/courses/${id}`} style={{ flex: 1 }}>
                        <Button variant="secondary" style={{ width: '100%' }}>
                          View details
                        </Button>
                      </Link>
                      <Button
                        magnetic
                        glow={!course.enrolled}
                        tone={course.enrolled ? 'neutral' : 'brand'}
                        onClick={() => handleAction(id, course.enrolled)}
                        disabled={enrollMutation.isPending}
                      >
                        {course.enrolled ? 'Open' : 'Enroll'}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </RevealItem>
            )
          })}
        </Reveal>
      )}

      {enrollMutation.isError && (
        <p role="alert" style={{ color: 'var(--nx-danger)', textAlign: 'center' }}>
          Enrollment could not be completed. Please try again.
        </p>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { coursesApi, lecturesApi, type CourseView, type ModuleItemDetailView } from '../../services/api'
import { renderSafeMarkdown } from '../../lib/safeMarkdown'
import { isSafeContentUrl } from '../../lib/safeUrl'
import { GlassCard, Badge, Button } from '../../design'
import styles from './CourseLearnPage.module.css'

function itemIdOf(item: { _id?: string; id?: string }): string | undefined {
  return item._id ?? item.id
}

export function CourseLearnPage() {
  const { courseId, itemId } = useParams<{ courseId: string; itemId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: course } = useQuery<CourseView>({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getOne(courseId!),
    enabled: Boolean(courseId),
  })

  const {
    data: item,
    isLoading,
    isError,
  } = useQuery<ModuleItemDetailView>({
    queryKey: ['module-item', courseId, itemId],
    queryFn: () => lecturesApi.getOne(courseId!, itemId!),
    enabled: Boolean(courseId && itemId),
  })

  const completeMutation = useMutation({
    mutationFn: () => lecturesApi.markComplete(courseId!, itemId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['module-item', courseId, itemId] }),
        queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['courses'] }),
      ])
    },
  })

  const flatItems = useMemo(
    () =>
      (course?.modules ?? []).flatMap((module) =>
        (module.moduleItems ?? []).map((moduleItem) => ({ moduleItem, moduleTitle: module.title }))
      ),
    [course]
  )
  const currentIndex = flatItems.findIndex(({ moduleItem }) => itemIdOf(moduleItem) === itemId)
  const previousId = currentIndex > 0 ? itemIdOf(flatItems[currentIndex - 1]!.moduleItem) : undefined
  const nextId =
    currentIndex >= 0 && currentIndex < flatItems.length - 1
      ? itemIdOf(flatItems[currentIndex + 1]!.moduleItem)
      : undefined
  const completedIds = new Set(course?.progress?.completedItems ?? [])

  if (isLoading) {
    return (
      <div role="status" style={{ padding: '80px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
        Loading lesson...
      </div>
    )
  }

  if (isError || !item) {
    return (
      <div className={styles.container}>
        <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
          <h1>Lesson unavailable</h1>
          <p role="alert" style={{ color: 'var(--nx-fg-muted)', marginTop: '12px' }}>
            This lesson does not exist, or you do not have access to it.
          </p>
          <Button style={{ marginTop: '24px' }} onClick={() => navigate(`/courses/${courseId}`)}>
            Return to course
          </Button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Link to={`/courses/${courseId}`} className={styles.backLink}>
        ← Back to course
      </Link>

      <div className={styles.gridTwo}>
        <GlassCard elevation="raised" className={styles.lessonCard}>
          <div className={styles.lessonHeader}>
            <Badge tone="cyan">{item.type.replace('_', ' ')}</Badge>
            {item.completed && <Badge tone="success">Completed</Badge>}
          </div>
          <h1 className={styles.title}>{item.title}</h1>
          {item.description && <p className={styles.description}>{item.description}</p>}

          <div className={styles.content}>
            <LessonContent item={item} />
          </div>

          <div className={styles.actions}>
            {previousId ? (
              <Link to={`/courses/${courseId}/learn/${previousId}`}>
                <Button variant="ghost">← Previous</Button>
              </Link>
            ) : (
              <span />
            )}
            <Button
              magnetic
              glow
              tone={item.completed ? 'neutral' : 'brand'}
              disabled={item.completed || completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {item.completed ? 'Completed' : completeMutation.isPending ? 'Saving...' : 'Mark complete'}
            </Button>
            {nextId ? (
              <Link to={`/courses/${courseId}/learn/${nextId}`}>
                <Button variant="ghost">Next →</Button>
              </Link>
            ) : (
              <span />
            )}
          </div>
          {completeMutation.isError && (
            <p role="alert" style={{ color: 'var(--nx-danger)', marginTop: '12px' }}>
              Could not save your progress. Please try again.
            </p>
          )}
        </GlassCard>

        <aside>
          <GlassCard style={{ padding: '20px' }} aria-label="Course syllabus">
            <h2 className={styles.syllabusTitle}>Syllabus</h2>
            <nav className={styles.syllabusList}>
              {flatItems.map(({ moduleItem }) => {
                const id = itemIdOf(moduleItem)
                if (!id) return null
                const active = id === itemId
                return (
                  <Link
                    key={id}
                    to={`/courses/${courseId}/learn/${id}`}
                    className={`${styles.syllabusItem} ${active ? styles.syllabusItemActive : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span>{moduleItem.title}</span>
                    {completedIds.has(id) && (
                      <span aria-label="Completed" title="Completed">
                        ✓
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </GlassCard>
        </aside>
      </div>
    </div>
  )
}

function LessonContent({ item }: { item: ModuleItemDetailView }) {
  switch (item.type) {
    case 'video':
      return isSafeContentUrl(item.url) ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video controls src={item.url} className={styles.media} />
      ) : (
        <EmptyContent />
      )
    case 'youtube':
      return item.videoId ? (
        <iframe
          title={item.title}
          className={styles.media}
          src={`https://www.youtube-nocookie.com/embed/${item.videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <EmptyContent />
      )
    case 'pdf':
      return isSafeContentUrl(item.url) ? (
        <iframe title={item.title} src={item.url} className={styles.media} />
      ) : (
        <EmptyContent />
      )
    case 'markdown':
      return item.content ? (
        <div
          className={styles.prose}
          dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(item.content) }}
        />
      ) : (
        <EmptyContent />
      )
    case 'rich_text':
      return item.content ? (
        <div
          className={styles.prose}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content) }}
        />
      ) : (
        <EmptyContent />
      )
    case 'external_url':
      return isSafeContentUrl(item.url) ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          Open external resource ↗
        </a>
      ) : (
        <EmptyContent />
      )
    case 'live_session':
      return isSafeContentUrl(item.url) ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          Join live session ↗
        </a>
      ) : (
        <p style={{ color: 'var(--nx-fg-muted)' }}>Live session details have not been published yet.</p>
      )
    case 'file':
      return isSafeContentUrl(item.url) ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          Download file ↗
        </a>
      ) : (
        <EmptyContent />
      )
    default:
      return <EmptyContent />
  }
}

function EmptyContent() {
  return <p style={{ color: 'var(--nx-fg-muted)' }}>No content has been added to this lesson yet.</p>
}

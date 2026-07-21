import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, Check, Eye, FileCheck2, LayoutList, Settings2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError, instructorApi, type CourseStatus, type CourseWorkspace } from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { AssessmentBuilder } from '../../features/instructor/AssessmentBuilder'
import { CoursePreview } from '../../features/instructor/CoursePreview'
import { CourseSetupWizard } from '../../features/instructor/CourseSetupWizard'
import { CurriculumBuilder } from '../../features/instructor/CurriculumBuilder'
import { useCourseBuilderStore } from '../../features/instructor/courseBuilderStore'
import styles from '../../features/instructor/InstructorWorkspace.module.css'

type WorkspaceTab = 'setup' | 'curriculum' | 'assessments' | 'preview'

const tabs: Array<{ value: WorkspaceTab; label: string; icon: typeof Settings2 }> = [
  { value: 'setup', label: 'Course setup', icon: Settings2 },
  { value: 'curriculum', label: 'Curriculum', icon: LayoutList },
  { value: 'assessments', label: 'Assessments', icon: FileCheck2 },
  { value: 'preview', label: 'Preview', icon: Eye },
]

const statusTone: Record<CourseStatus, 'neutral' | 'cyan' | 'success' | 'violet'> = {
  draft: 'neutral',
  review: 'cyan',
  published: 'success',
  archived: 'violet',
}

function SaveIndicator({ status, lastSavedAt }: { status: string; lastSavedAt: Date | null }) {
  const label =
    status === 'saving'
      ? 'Saving…'
      : status === 'dirty'
        ? 'Unsaved changes'
        : status === 'error'
          ? 'Save failed'
          : lastSavedAt
            ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Saved'
  return (
    <span className={`${styles.saveIndicator} ${styles[`save_${status}`] ?? ''}`} role="status">
      <span />
      {label}
    </span>
  )
}

export function InstructorWorkspacePage() {
  const { courseId = '' } = useParams()
  const [tab, setTab] = useState<WorkspaceTab>('setup')
  const [workflowError, setWorkflowError] = useState<string[]>([])
  const savingRef = useRef(false)
  const queryClient = useQueryClient()
  const store = useCourseBuilderStore()

  const workspaceQuery = useQuery({
    queryKey: ['instructor', 'course', courseId],
    queryFn: () => instructorApi.getWorkspace(courseId),
    enabled: Boolean(courseId),
  })

  useEffect(() => {
    const incomingId = workspaceQuery.data?._id ?? workspaceQuery.data?.id
    const currentId = store.course?._id ?? store.course?.id
    if (workspaceQuery.data && incomingId !== currentId) {
      store.initialize(workspaceQuery.data)
    }
  }, [workspaceQuery.data, store])

  useEffect(() => () => useCourseBuilderStore.getState().reset(), [])

  const saveNow = useCallback(
    async (course: CourseWorkspace, revision: number) => {
      if (savingRef.current) return null
      savingRef.current = true
      store.markSaving()
      try {
        const saved = await instructorApi.saveWorkspace(courseId, course)
        store.acceptSaved(saved, revision)
        await queryClient.invalidateQueries({ queryKey: ['instructor', 'dashboard'] })
        return saved
      } catch (error) {
        store.markError(error instanceof Error ? error.message : 'Autosave failed')
        return null
      } finally {
        savingRef.current = false
      }
    },
    [courseId, queryClient, store]
  )

  useEffect(() => {
    if (!store.course || store.saveStatus !== 'dirty') return
    const course = store.course
    const revision = store.localRevision
    const timer = window.setTimeout(() => void saveNow(course, revision), 900)
    return () => window.clearTimeout(timer)
  }, [saveNow, store.course, store.localRevision, store.saveStatus])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (store.saveStatus === 'dirty' || store.saveStatus === 'saving') event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [store.saveStatus])

  const transition = useMutation({
    mutationFn: async (status: CourseStatus) => {
      if (!store.course) throw new Error('Course is still loading')
      const saved =
        store.saveStatus === 'dirty' || store.saveStatus === 'error'
          ? await instructorApi.saveWorkspace(courseId, store.course)
          : store.course
      return instructorApi.transitionStatus(courseId, status, saved.reviewNotes)
    },
    onSuccess: (saved) => {
      setWorkflowError([])
      store.initialize(saved)
      void queryClient.invalidateQueries({ queryKey: ['instructor', 'dashboard'] })
    },
    onError: (error) => {
      if (error instanceof ApiClientError && Array.isArray(error.details?.issues)) {
        setWorkflowError(error.details.issues)
      } else {
        setWorkflowError([error instanceof Error ? error.message : 'Status update failed'])
      }
    },
  })

  if (workspaceQuery.isError) {
    return (
      <div className={styles.workspacePage}>
        <GlassCard className={styles.errorState}>
          <h1>Course workspace unavailable</h1>
          <p>{workspaceQuery.error.message}</p>
          <Button type="button" onClick={() => void workspaceQuery.refetch()}>
            Try again
          </Button>
        </GlassCard>
      </div>
    )
  }

  if (workspaceQuery.isLoading || !store.course) {
    return (
      <div className={styles.workspacePage}>
        <div className={styles.workspaceSkeleton} role="status">
          <span />
          <span />
          <span />
          <p>Loading course workspace…</p>
        </div>
      </div>
    )
  }

  const course = store.course
  const totalLessons = course.modules.reduce((total, module) => total + module.moduleItems.length, 0)
  const action =
    course.status === 'draft'
      ? { status: 'review' as const, label: 'Submit for review' }
      : course.status === 'review'
        ? { status: 'published' as const, label: 'Publish course' }
        : course.status === 'published'
          ? { status: 'draft' as const, label: 'Unpublish' }
          : { status: 'draft' as const, label: 'Restore draft' }

  return (
    <div className={styles.workspacePage}>
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceTitleRow}>
          <Link className={styles.backLink} to="/instructor" aria-label="Back to instructor dashboard">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className={styles.eyebrowRow}>
              <Badge tone={statusTone[course.status]}>{course.status}</Badge>
              <SaveIndicator status={store.saveStatus} lastSavedAt={store.lastSavedAt} />
            </div>
            <h1>{course.name}</h1>
            <p>
              {course.modules.length} modules · {totalLessons} lessons · {course.assessments.length}{' '}
              assessments
            </p>
          </div>
        </div>
        <div className={styles.workflowActions}>
          {course.status !== 'archived' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Archive size={16} />}
              disabled={transition.isPending}
              onClick={() => transition.mutate('archived')}
            >
              Archive
            </Button>
          )}
          {course.status === 'review' && (
            <Button type="button" variant="secondary" size="sm" onClick={() => transition.mutate('draft')}>
              Return to draft
            </Button>
          )}
          <Button
            type="button"
            glow
            leftIcon={<Check size={17} />}
            disabled={transition.isPending}
            onClick={() => transition.mutate(action.status)}
          >
            {transition.isPending ? 'Updating…' : action.label}
          </Button>
        </div>
      </header>

      {store.error && (
        <div className={styles.saveError} role="alert">
          <strong>Autosave needs attention.</strong> {store.error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void saveNow(course, store.localRevision)}
          >
            Retry now
          </Button>
        </div>
      )}
      {workflowError.length > 0 && (
        <div className={styles.validationSummary} role="alert">
          <strong>Complete these items before changing course status:</strong>
          <ul>
            {workflowError.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <nav className={styles.workspaceTabs} aria-label="Course builder sections">
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.value}
              type="button"
              className={tab === item.value ? styles.tabActive : undefined}
              aria-current={tab === item.value ? 'page' : undefined}
              onClick={() => setTab(item.value)}
            >
              <Icon size={17} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className={styles.workspaceContent}>
        {tab === 'setup' && (
          <CourseSetupWizard course={course} courseId={courseId} onChange={store.updateCourse} />
        )}
        {tab === 'curriculum' && (
          <CurriculumBuilder course={course} courseId={courseId} onChange={store.updateCourse} />
        )}
        {tab === 'assessments' && (
          <AssessmentBuilder course={course} courseId={courseId} onChange={store.updateCourse} />
        )}
        {tab === 'preview' && <CoursePreview course={course} />}
      </div>
    </div>
  )
}

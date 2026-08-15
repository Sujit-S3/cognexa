import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, Check, Eye, FileCheck2, LayoutList, Settings2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError, instructorApi, type CourseStatus, type CourseWorkspace } from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { useCourseBuilderStore } from '../../features/instructor/courseBuilderStore'
import styles from '../../features/instructor/InstructorWorkspace.module.css'

// Only one tab renders at a time — splitting these out keeps the rich text editor
// (@tiptap/*, used by CurriculumBuilder and AssessmentBuilder) out of the initial workspace
// bundle for instructors who never leave the setup/preview tabs.
const CourseSetupWizard = lazy(() =>
  import('../../features/instructor/CourseSetupWizard').then((m) => ({ default: m.CourseSetupWizard }))
)
const CurriculumBuilder = lazy(() =>
  import('../../features/instructor/CurriculumBuilder').then((m) => ({ default: m.CurriculumBuilder }))
)
const AssessmentBuilder = lazy(() =>
  import('../../features/instructor/AssessmentBuilder').then((m) => ({ default: m.AssessmentBuilder }))
)
const CoursePreview = lazy(() =>
  import('../../features/instructor/CoursePreview').then((m) => ({ default: m.CoursePreview }))
)

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
  // Holds the in-flight save's promise (not just a boolean) so a caller that needs the result —
  // like transition below — can await whatever save is already running instead of either
  // silently no-oping or firing a second concurrent PUT with a stale draftVersion.
  const savingRef = useRef<Promise<CourseWorkspace | null> | null>(null)
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
    (course: CourseWorkspace, revision: number): Promise<CourseWorkspace | null> => {
      if (savingRef.current) return savingRef.current
      const promise = (async () => {
        store.markSaving()
        try {
          const saved = await instructorApi.saveWorkspace(courseId, course)
          store.acceptSaved(saved, revision)
          // Keep the course-editor cache in sync with what was just persisted — without this,
          // reopening this course (or the grading page, which reads the same query key) within
          // the default 5-minute staleTime served the pre-edit rubric/status.
          queryClient.setQueryData(['instructor', 'course', courseId], saved)
          await queryClient.invalidateQueries({ queryKey: ['instructor', 'dashboard'] })
          return saved
        } catch (error) {
          store.markError(error instanceof Error ? error.message : 'Autosave failed')
          return null
        } finally {
          savingRef.current = null
        }
      })()
      savingRef.current = promise
      return promise
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
      // Routes through saveNow (not a direct saveWorkspace call) so this shares the same
      // in-flight guard as the debounced autosave — calling saveWorkspace directly here used to
      // let a status-change click race a pending autosave and both PUT concurrently, one of them
      // failing on a stale draftVersion right after a successful publish/status change.
      let saved = store.course
      if (store.saveStatus === 'dirty' || store.saveStatus === 'error' || savingRef.current) {
        const result = await saveNow(store.course, store.localRevision)
        if (!result) throw new Error('Could not save your changes before updating the status')
        saved = result
      }
      return instructorApi.transitionStatus(courseId, status, saved.reviewNotes)
    },
    onSuccess: (saved) => {
      setWorkflowError([])
      store.initialize(saved)
      queryClient.setQueryData(['instructor', 'course', courseId], saved)
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
        <Suspense fallback={<div className={styles.workspaceSkeleton} role="status" />}>
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
        </Suspense>
      </div>
    </div>
  )
}

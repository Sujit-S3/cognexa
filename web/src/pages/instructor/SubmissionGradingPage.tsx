import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  instructorApi,
  type CourseAssessmentView,
  type RubricScoreView,
  type SubmissionView,
} from '../../services/api'
import { isSafeContentUrl } from '../../lib/safeUrl'
import { GlassCard, Badge, Button } from '../../design'
import styles from './SubmissionGradingPage.module.css'

export function SubmissionGradingPage() {
  const { courseId = '' } = useParams<{ courseId: string }>()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const submissionsQuery = useQuery({
    queryKey: ['instructor', 'submissions', courseId],
    queryFn: () => instructorApi.getSubmissionsQueue(courseId),
    enabled: Boolean(courseId),
  })
  const workspaceQuery = useQuery({
    queryKey: ['instructor', 'course', courseId],
    queryFn: () => instructorApi.getWorkspace(courseId),
    enabled: Boolean(courseId),
  })

  const submissions = submissionsQuery.data ?? []
  const selected = submissions.find((submission) => submission.id === selectedId) ?? submissions[0] ?? null
  const assessment = workspaceQuery.data?.assessments.find(
    (item) => (item._id ?? item.id) === selected?.courseAssessmentId
  )

  const gradeMutation = useMutation({
    mutationFn: (payload: { score?: number; rubricScores?: RubricScoreView[]; feedback?: string }) =>
      instructorApi.gradeSubmission(courseId, selected!.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'submissions', courseId] })
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'dashboard'] })
    },
  })

  if (submissionsQuery.isLoading) {
    return (
      <div role="status" style={{ padding: '80px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
        Loading submissions...
      </div>
    )
  }

  if (submissionsQuery.isError) {
    return (
      <div className={styles.container}>
        <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
          <h1>Submissions unavailable</h1>
          <p role="alert" style={{ color: 'var(--nx-fg-muted)', marginTop: '12px' }}>
            This queue could not be loaded.
          </p>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Link to={`/instructor/courses/${courseId}/edit`} className={styles.backLink}>
        <ArrowLeft size={16} /> Back to course
      </Link>
      <h1 className={styles.title}>Assignment submissions</h1>

      <div className={styles.gridTwo}>
        <div className={styles.list}>
          {submissions.length === 0 ? (
            <GlassCard style={{ padding: '24px' }}>
              <p style={{ color: 'var(--nx-fg-muted)' }}>No assignment submissions yet.</p>
            </GlassCard>
          ) : (
            submissions.map((submission) => (
              <button
                key={submission.id}
                type="button"
                className={`${styles.listItem} ${selected?.id === submission.id ? styles.listItemActive : ''}`}
                onClick={() => setSelectedId(submission.id)}
              >
                <div>
                  <strong>{submission.assessmentTitleSnapshot}</strong>
                  <p>{(submission.student as unknown as { name?: string })?.name ?? 'Learner'}</p>
                </div>
                <Badge tone={submission.status === 'graded' ? 'success' : 'cyan'}>{submission.status}</Badge>
              </button>
            ))
          )}
        </div>

        <div className={styles.detail}>
          {selected ? (
            <GradingPanel
              key={selected.id}
              submission={selected}
              rubric={assessment?.rubric ?? []}
              onGrade={(payload) => gradeMutation.mutate(payload)}
              grading={gradeMutation.isPending}
              error={gradeMutation.isError}
            />
          ) : (
            <GlassCard style={{ padding: '24px' }}>
              <p style={{ color: 'var(--nx-fg-muted)' }}>Select a submission to review.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}

function GradingPanel({
  submission,
  rubric,
  onGrade,
  grading,
  error,
}: {
  submission: SubmissionView
  rubric: CourseAssessmentView['rubric']
  onGrade: (payload: { score?: number; rubricScores?: RubricScoreView[]; feedback?: string }) => void
  grading: boolean
  error: boolean
}) {
  const [points, setPoints] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    setPoints(
      Object.fromEntries((submission.rubricScores ?? []).map((entry) => [entry.criterionId, entry.points]))
    )
    setFeedback(submission.feedback ?? '')
  }, [submission.id, submission.rubricScores, submission.feedback])

  const totalPossible = rubric.reduce((sum, criterion) => sum + criterion.points, 0)
  const totalAwarded = rubric.reduce(
    (sum, criterion) => sum + (points[criterion._id ?? criterion.id ?? ''] ?? 0),
    0
  )

  return (
    <GlassCard style={{ padding: '28px' }}>
      <div className={styles.detailHeader}>
        <div>
          <Badge tone={submission.status === 'graded' ? 'success' : 'cyan'}>{submission.status}</Badge>
          <h2>{submission.assessmentTitleSnapshot}</h2>
        </div>
        <span style={{ color: 'var(--nx-fg-muted)', fontSize: '0.85rem' }}>
          Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}
        </span>
      </div>

      {submission.text && (
        <div className={styles.responseBlock}>
          <h3>Learner response</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{submission.text}</p>
        </div>
      )}

      {(submission.attachments ?? []).length > 0 && (
        <div className={styles.responseBlock}>
          <h3>Attachments</h3>
          {submission.attachments!.map((asset) =>
            isSafeContentUrl(asset.url) ? (
              <a key={asset.publicId ?? asset.url} href={asset.url} target="_blank" rel="noopener noreferrer">
                {asset.originalName ?? asset.url}
              </a>
            ) : (
              <span key={asset.publicId ?? asset.url}>{asset.originalName ?? 'Attachment unavailable'}</span>
            )
          )}
        </div>
      )}

      {rubric.length > 0 && (
        <div className={styles.rubricGrading}>
          <h3>Rubric</h3>
          {rubric.map((criterion) => {
            const criterionId = criterion._id ?? criterion.id ?? ''
            return (
              <div key={criterionId} className={styles.rubricGradeRow}>
                <div>
                  <strong>{criterion.title}</strong>
                  {criterion.description && <p>{criterion.description}</p>}
                </div>
                <div className={styles.pointsInput}>
                  <input
                    type="number"
                    min={0}
                    max={criterion.points}
                    aria-label={`Points for ${criterion.title}`}
                    value={points[criterionId] ?? 0}
                    onChange={(event) =>
                      setPoints((current) => ({ ...current, [criterionId]: Number(event.target.value) }))
                    }
                  />
                  <span>/ {criterion.points}</span>
                </div>
              </div>
            )
          })}
          <div className={styles.rubricTotal}>
            Total: {totalAwarded} / {totalPossible}
          </div>
        </div>
      )}

      <label className={styles.label} htmlFor="grading-feedback">
        Feedback
      </label>
      <textarea
        id="grading-feedback"
        className={styles.textarea}
        rows={5}
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
      />

      <Button
        magnetic
        glow
        disabled={grading}
        style={{ marginTop: '16px' }}
        onClick={() =>
          onGrade({
            rubricScores: rubric.map((criterion) => ({
              criterionId: criterion._id ?? criterion.id ?? '',
              points: points[criterion._id ?? criterion.id ?? ''] ?? 0,
            })),
            feedback,
          })
        }
      >
        {grading ? 'Saving...' : 'Save grade'}
      </Button>
      {error && (
        <p role="alert" style={{ color: 'var(--nx-danger)', marginTop: '10px' }}>
          Could not save the grade. Please try again.
        </p>
      )}
    </GlassCard>
  )
}

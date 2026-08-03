import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assessmentsApi, type SubmissionView, type UploadedAssetView } from '../../services/api'
import { UploadField } from '../../features/instructor/UploadField'
import { GlassCard, Badge, Button } from '../../design'
import styles from './AssignmentSubmissionPage.module.css'

const draftSchema = z.object({
  text: z.string().max(50_000).optional(),
})

type DraftValues = z.infer<typeof draftSchema>

export function AssignmentSubmissionPage() {
  const { courseId, assessmentId } = useParams<{ courseId: string; assessmentId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [attachments, setAttachments] = useState<UploadedAssetView[]>([])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assessment', courseId, assessmentId],
    queryFn: () => assessmentsApi.getForLearner(courseId!, assessmentId!),
    enabled: Boolean(courseId && assessmentId),
  })

  const submission = data?.submission
  const editable = submission?.status === 'in_progress'

  const { register, handleSubmit, reset } = useForm<DraftValues>({
    resolver: zodResolver(draftSchema),
    defaultValues: { text: '' },
  })

  useEffect(() => {
    if (submission) {
      reset({ text: submission.text ?? '' })
      setAttachments(submission.attachments ?? [])
    }
    // Only re-sync local form state when a different submission loads — `submission` is a new
    // object reference on every query refetch even when its content hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id, reset])

  const startMutation = useMutation({
    mutationFn: () => assessmentsApi.startAttempt(courseId!, assessmentId!),
    onSuccess: () => void refetch(),
  })

  const saveDraft = useMutation({
    mutationFn: (values: DraftValues) =>
      assessmentsApi.updateSubmission(submission!.id, { text: values.text, attachments }),
  })

  const submitMutation = useMutation({
    mutationFn: (values: DraftValues) =>
      assessmentsApi.submitSubmission(submission!.id, { text: values.text, attachments }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assessment', courseId, assessmentId] }),
        queryClient.invalidateQueries({ queryKey: ['deadlines'] }),
      ])
    },
  })

  if (isLoading) {
    return (
      <div role="status" style={{ padding: '80px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
        Loading assignment...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={styles.container}>
        <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
          <h1>Assignment unavailable</h1>
          <p role="alert" style={{ color: 'var(--nx-fg-muted)', marginTop: '12px' }}>
            This assignment does not exist, or you do not have access to it.
          </p>
          <Button style={{ marginTop: '24px' }} onClick={() => navigate(`/courses/${courseId}`)}>
            Return to course
          </Button>
        </GlassCard>
      </div>
    )
  }

  const { assessment, attemptsUsed, attemptsAllowed } = data

  return (
    <div className={styles.container}>
      <GlassCard style={{ padding: '36px' }}>
        <Badge tone="violet">Assignment</Badge>
        <h1 className={styles.title}>{assessment.title}</h1>
        {assessment.instructions && <p className={styles.description}>{assessment.instructions}</p>}

        <dl className={styles.metaGrid}>
          {assessment.dueDate && (
            <div>
              <dt>Due</dt>
              <dd>{new Date(assessment.dueDate).toLocaleString()}</dd>
            </div>
          )}
          <div>
            <dt>Attempts</dt>
            <dd>
              {attemptsUsed} of {attemptsAllowed} used
            </dd>
          </div>
        </dl>

        {assessment.rubric.length > 0 && (
          <div className={styles.rubric}>
            <h2 className={styles.sectionTitle}>Grading rubric</h2>
            {assessment.rubric.map((criterion) => {
              const graded = submission?.status === 'graded'
              const scored = submission?.rubricScores?.find(
                (entry) => entry.criterionId === (criterion._id ?? criterion.id)
              )
              return (
                <div key={criterion._id ?? criterion.id} className={styles.rubricRow}>
                  <div>
                    <strong>{criterion.title}</strong>
                    {criterion.description && <p>{criterion.description}</p>}
                  </div>
                  <span>
                    {graded ? `${scored?.points ?? 0} / ` : ''}
                    {criterion.points} pts
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {!submission ? (
          attemptsUsed >= attemptsAllowed ? (
            <p role="alert" style={{ color: 'var(--nx-danger)', marginTop: '20px' }}>
              You have used all allowed attempts for this assignment.
            </p>
          ) : (
            <Button
              magnetic
              glow
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
              style={{ marginTop: '20px' }}
            >
              {startMutation.isPending ? 'Starting...' : 'Start assignment'}
            </Button>
          )
        ) : editable ? (
          <form className={styles.form} onSubmit={handleSubmit((values) => submitMutation.mutate(values))}>
            <label className={styles.label} htmlFor="assignment-text">
              Your response
            </label>
            <textarea id="assignment-text" className={styles.textarea} rows={10} {...register('text')} />

            <div className={styles.attachments}>
              <h3 className={styles.sectionTitle}>Attachments</h3>
              {attachments.map((asset, index) => (
                <div key={asset.publicId ?? asset.url} className={styles.attachmentRow}>
                  <span>{asset.originalName ?? asset.url}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <UploadField
                courseId={courseId!}
                label="Add a file"
                help="PDF, Word, image, or archive — up to 100 MB"
                purpose="assignment-submission"
                resourceType="raw"
                accept=".pdf,.doc,.docx,.csv,.txt,.zip,.jpg,.jpeg,.png,.webp"
                onUploaded={(asset) => setAttachments((current) => [...current, asset])}
              />
            </div>

            <div className={styles.actions}>
              <Button
                type="button"
                variant="ghost"
                disabled={saveDraft.isPending}
                onClick={handleSubmit((values) => saveDraft.mutate(values))}
              >
                {saveDraft.isPending ? 'Saving...' : saveDraft.isSuccess ? 'Draft saved' : 'Save draft'}
              </Button>
              <Button magnetic glow type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting...' : 'Submit assignment'}
              </Button>
            </div>
            {(saveDraft.isError || submitMutation.isError) && (
              <p role="alert" style={{ color: 'var(--nx-danger)', marginTop: '10px' }}>
                Something went wrong saving your work. Please try again.
              </p>
            )}
          </form>
        ) : (
          <SubmissionReceipt submission={submission} />
        )}
      </GlassCard>
    </div>
  )
}

function SubmissionReceipt({ submission }: { submission: SubmissionView }) {
  return (
    <div className={styles.receipt}>
      <Badge tone={submission.status === 'graded' ? (submission.passed ? 'success' : 'pink') : 'cyan'}>
        {submission.status === 'graded'
          ? submission.passed
            ? 'Passed'
            : 'Graded'
          : 'Submitted — awaiting review'}
      </Badge>
      {submission.status === 'graded' && (
        <p className={styles.description}>
          Score: {submission.score} / {submission.maxScore}
        </p>
      )}
      {submission.feedback && (
        <div className={styles.feedback}>
          <h3 className={styles.sectionTitle}>Instructor feedback</h3>
          <p>{submission.feedback}</p>
        </div>
      )}
      {submission.text && (
        <div className={styles.feedback}>
          <h3 className={styles.sectionTitle}>Your response</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{submission.text}</p>
        </div>
      )}
    </div>
  )
}

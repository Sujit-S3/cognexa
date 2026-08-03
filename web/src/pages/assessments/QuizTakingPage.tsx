import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assessmentsApi,
  type AssessmentLearnerView,
  type QuizAttemptQuestionView,
  type SubmissionView,
} from '../../services/api'
import { answersToPayload, useQuizAttemptStore } from '../../features/assessments/quizAttemptStore'
import { GlassCard, Badge, Button } from '../../design'
import styles from './QuizTakingPage.module.css'

function useTimeRemaining(expiresAt?: string): number | null {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null)
      return
    }
    const expiry = new Date(expiresAt).getTime()
    const tick = () => setRemaining(Math.max(0, expiry - Date.now()))
    tick()
    const interval = window.setInterval(tick, 1_000)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  return remaining
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1_000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function QuizTakingPage() {
  const { courseId, assessmentId } = useParams<{ courseId: string; assessmentId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const store = useQuizAttemptStore()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assessment', courseId, assessmentId],
    queryFn: () => assessmentsApi.getForLearner(courseId!, assessmentId!),
    enabled: Boolean(courseId && assessmentId),
  })

  const submission = data?.submission
  const inProgress = submission?.status === 'in_progress' ? submission : null
  const inProgressId = inProgress?.id

  useEffect(() => {
    if (inProgressId) {
      useQuizAttemptStore.getState().initialize(inProgressId, inProgress?.answers ?? [])
    }
    return () => useQuizAttemptStore.getState().reset()
    // Only re-sync when a different attempt loads — store methods are stable, answers/inProgress
    // objects are not (new reference every fetch), which would otherwise re-run this every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inProgressId])

  const startMutation = useMutation({
    mutationFn: () => assessmentsApi.startAttempt(courseId!, assessmentId!),
    onSuccess: () => void refetch(),
  })

  const saveAnswers = useMutation({
    mutationFn: async (revision: number) => {
      await assessmentsApi.updateSubmission(store.submissionId!, { answers: answersToPayload(store.answers) })
      return revision
    },
    onMutate: () => store.markSaving(),
    onSuccess: (revision) => store.acceptSaved(revision),
    onError: (error) => store.markError(error instanceof Error ? error.message : 'Autosave failed'),
  })

  useEffect(() => {
    if (store.saveStatus !== 'dirty' || !store.submissionId) return
    const revision = store.localRevision
    const timer = window.setTimeout(() => saveAnswers.mutate(revision), 900)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.saveStatus, store.localRevision, store.submissionId])

  const submitMutation = useMutation({
    mutationFn: () =>
      assessmentsApi.submitSubmission(store.submissionId!, { answers: answersToPayload(store.answers) }),
    onSuccess: async () => {
      store.reset()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assessment', courseId, assessmentId] }),
        queryClient.invalidateQueries({ queryKey: ['deadlines'] }),
      ])
    },
  })

  const timeRemainingMs = useTimeRemaining(inProgress?.timeLimitExpiresAt)
  useEffect(() => {
    if (timeRemainingMs === 0 && inProgress && !submitMutation.isPending) {
      submitMutation.mutate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemainingMs])

  if (isLoading) {
    return (
      <div role="status" style={{ padding: '80px', textAlign: 'center', color: 'var(--nx-fg-muted)' }}>
        Loading quiz...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={styles.container}>
        <GlassCard style={{ padding: '48px', textAlign: 'center' }}>
          <h1>Quiz unavailable</h1>
          <p role="alert" style={{ color: 'var(--nx-fg-muted)', marginTop: '12px' }}>
            This quiz does not exist, or you do not have access to it.
          </p>
          <Button style={{ marginTop: '24px' }} onClick={() => navigate(`/courses/${courseId}`)}>
            Return to course
          </Button>
        </GlassCard>
      </div>
    )
  }

  const { assessment, attemptsUsed, attemptsAllowed } = data

  if (submission?.status === 'graded') {
    return (
      <QuizResults
        assessment={assessment}
        submission={submission}
        attemptsUsed={attemptsUsed}
        attemptsAllowed={attemptsAllowed}
        onRetake={() => startMutation.mutate()}
        retaking={startMutation.isPending}
      />
    )
  }

  if (!inProgress) {
    return (
      <div className={styles.container}>
        <GlassCard style={{ padding: '40px' }}>
          <Badge tone="cyan">Quiz</Badge>
          <h1 className={styles.title}>{assessment.title}</h1>
          {assessment.instructions && <p className={styles.description}>{assessment.instructions}</p>}
          <dl className={styles.metaGrid}>
            <div>
              <dt>Questions</dt>
              <dd>{assessment.questionPoolSize ?? assessment.questionCount}</dd>
            </div>
            <div>
              <dt>Passing score</dt>
              <dd>{assessment.passingScore}%</dd>
            </div>
            {assessment.timeLimitMinutes && (
              <div>
                <dt>Time limit</dt>
                <dd>{assessment.timeLimitMinutes} minutes</dd>
              </div>
            )}
            <div>
              <dt>Attempts</dt>
              <dd>
                {attemptsUsed} of {attemptsAllowed} used
              </dd>
            </div>
          </dl>
          {attemptsUsed >= attemptsAllowed ? (
            <p role="alert" style={{ color: 'var(--nx-danger)' }}>
              You have used all allowed attempts for this quiz.
            </p>
          ) : (
            <Button magnetic glow disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
              {startMutation.isPending ? 'Starting...' : 'Start quiz'}
            </Button>
          )}
          {startMutation.isError && (
            <p role="alert" style={{ color: 'var(--nx-danger)', marginTop: '10px' }}>
              Could not start the quiz. Please try again.
            </p>
          )}
        </GlassCard>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <GlassCard style={{ padding: '32px' }}>
        <div className={styles.quizHeader}>
          <div>
            <Badge tone="cyan">Quiz</Badge>
            <h1 className={styles.title}>{assessment.title}</h1>
          </div>
          {timeRemainingMs !== null && (
            <Badge tone={timeRemainingMs < 60_000 ? 'pink' : 'neutral'}>
              {formatDuration(timeRemainingMs)}
            </Badge>
          )}
        </div>

        {(inProgress.presentedQuestions ?? []).map((question, index) => (
          <QuestionField
            key={question.questionId}
            index={index}
            question={question}
            value={store.answers[question.questionId] ?? []}
            onChange={(response) => store.setAnswer(question.questionId, response)}
          />
        ))}

        <div className={styles.actions}>
          <span role="status" className={styles.saveStatus}>
            {store.saveStatus === 'saving'
              ? 'Saving...'
              : store.saveStatus === 'error'
                ? 'Save failed'
                : store.saveStatus === 'dirty'
                  ? 'Unsaved changes'
                  : 'Saved'}
          </span>
          <Button magnetic glow disabled={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? 'Submitting...' : 'Submit quiz'}
          </Button>
        </div>
        {submitMutation.isError && (
          <p role="alert" style={{ color: 'var(--nx-danger)', marginTop: '10px' }}>
            Could not submit the quiz. Please try again.
          </p>
        )}
      </GlassCard>
    </div>
  )
}

function QuestionField({
  index,
  question,
  value,
  onChange,
}: {
  index: number
  question: QuizAttemptQuestionView
  value: string[]
  onChange: (response: string[]) => void
}) {
  return (
    <fieldset className={styles.questionField}>
      <legend className={styles.questionLegend}>
        <span>Question {index + 1}</span>
        <span className={styles.questionPoints}>
          {question.points} {question.points === 1 ? 'point' : 'points'}
        </span>
      </legend>
      <p className={styles.questionPrompt}>{question.prompt}</p>

      {question.type === 'fill_blank' ? (
        <input
          type="text"
          className={styles.textInput}
          aria-label={`Answer for question ${index + 1}`}
          value={value[0] ?? ''}
          onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
        />
      ) : question.type === 'multiple_select' ? (
        <div className={styles.optionsList}>
          {question.options.map((option) => (
            <label key={option} className={styles.optionRow}>
              <input
                type="checkbox"
                checked={value.includes(option)}
                onChange={(event) =>
                  onChange(
                    event.target.checked ? [...value, option] : value.filter((entry) => entry !== option)
                  )
                }
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <div className={styles.optionsList}>
          {question.options.map((option) => (
            <label key={option} className={styles.optionRow}>
              <input
                type="radio"
                name={question.questionId}
                checked={value[0] === option}
                onChange={() => onChange([option])}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

function QuizResults({
  assessment,
  submission,
  attemptsUsed,
  attemptsAllowed,
  onRetake,
  retaking,
}: {
  assessment: AssessmentLearnerView
  submission: SubmissionView
  attemptsUsed: number
  attemptsAllowed: number
  onRetake: () => void
  retaking: boolean
}) {
  const resultsByQuestion = new Map(
    (submission.questionResults ?? []).map((result) => [result.questionId, result])
  )
  const answerKeyByQuestion = new Map((submission.answerKey ?? []).map((entry) => [entry.questionId, entry]))
  const percent = Math.round(((submission.score ?? 0) / (submission.maxScore || 1)) * 100)

  return (
    <div className={styles.container}>
      <GlassCard style={{ padding: '40px' }}>
        <Badge tone={submission.passed ? 'success' : 'pink'}>
          {submission.passed ? 'Passed' : 'Not passed'}
        </Badge>
        <h1 className={styles.title}>{assessment.title}</h1>
        <p className={styles.description}>
          You scored {submission.score} / {submission.maxScore} ({percent}%). Passing score is{' '}
          {assessment.passingScore}%.
        </p>

        <div className={styles.resultsList}>
          {(submission.presentedQuestions ?? []).map((question, index) => {
            const result = resultsByQuestion.get(question.questionId)
            const answerKey = answerKeyByQuestion.get(question.questionId)
            return (
              <div key={question.questionId} className={styles.resultRow}>
                <div className={styles.resultRowHeader}>
                  <Badge tone={result?.correct ? 'success' : 'pink'}>
                    {result?.correct ? 'Correct' : 'Incorrect'}
                  </Badge>
                  <span className={styles.resultPrompt}>
                    Question {index + 1}: {question.prompt}
                  </span>
                  <span style={{ color: 'var(--nx-fg-muted)' }}>
                    {result?.pointsAwarded ?? 0}/{result?.pointsPossible ?? question.points} pts
                  </span>
                </div>
                {!result?.correct && answerKey && (
                  <div className={styles.answerKey}>
                    <p>
                      <strong>Correct answer:</strong> {answerKey.correctAnswers.join(', ')}
                    </p>
                    {answerKey.explanation && <p>{answerKey.explanation}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {attemptsUsed < attemptsAllowed && (
          <Button magnetic glow disabled={retaking} onClick={onRetake} style={{ marginTop: '24px' }}>
            {retaking ? 'Starting...' : 'Retake quiz'}
          </Button>
        )}
      </GlassCard>
    </div>
  )
}

import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../services/api'
import { GlassCard, Badge, Button } from '../../design'
import styles from './AssignmentPage.module.css'

const schema = z.object({
  githubUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

// Submission to backend (best-effort — 404 tolerated in demo)
async function submitAssignment(assessmentId: string, values: FormValues & { file?: File }) {
  try {
    const formData = new FormData()
    if (values.githubUrl) formData.append('githubUrl', values.githubUrl)
    if (values.notes) formData.append('notes', values.notes)
    if (values.file) formData.append('file', values.file)
    await api.post(`/courses/submissions/${assessmentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch {
    // Backend endpoint may not exist in demo — we still transition UI
  }
}

const RUBRIC = [
  { label: 'Algorithm / Core Logic', pts: 40 },
  { label: 'Code Structure & Documentation', pts: 30 },
  { label: 'Edge Case Handling', pts: 20 },
  { label: 'Performance Optimization', pts: 10 },
]

export function AssignmentPage() {
  const { assessmentId = 'mock-1' } = useParams<{ assessmentId: string }>()
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => submitAssignment(assessmentId, { ...values, file: file ?? undefined }),
    onSuccess: () => {
      setSubmitted(true)
      setSubmittedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    },
  })

  const onSubmit = (values: FormValues) => mutation.mutate(values)

  const githubUrl = watch('githubUrl', '')

  const TITLE = assessmentId === 'mock-1'
    ? 'Neural Control Lab Submission'
    : `Assignment ${assessmentId}`

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span className={styles.sep}>/</span>
        <span>Assessments</span>
        <span className={styles.sep}>/</span>
        <span className={styles.current}>{TITLE}</span>
      </nav>

      <div className={styles.layout}>
        {/* Left — Brief */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <GlassCard elevation="raised" glow className={styles.briefCard}>
            <Badge tone="cyan" style={{ marginBottom: '10px' }}>100 Points • +250 XP</Badge>
            <h1 className={styles.title}>{TITLE}</h1>
            <p className={styles.desc}>
              Implement the Jacobian inverse kinematics calculation in Python and connect it to the
              WebGL shader visualizer. Your code must compute angle velocities without gimbal lock
              at a stable 60 FPS render loop.
            </p>

            <div className={styles.rubric}>
              <div className={styles.rubricHeader}>📋 Grading Rubric</div>
              {RUBRIC.map((r) => (
                <div key={r.label} className={styles.rubricRow}>
                  <span>{r.label}</span>
                  <strong>{r.pts} pts</strong>
                </div>
              ))}
            </div>

            <GlassCard style={{ padding: '18px', marginTop: '4px' }}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: '8px', fontSize: '0.9rem' }}>
                💡 Submission Instructions
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.86rem', color: 'var(--nx-fg-muted)' }}>
                <li>• GitHub repository must be public or accessible to instructors.</li>
                <li>• Include compiled <code style={{ color: 'var(--nx-accent-cyan)' }}>.glsl</code> shader files in root.</li>
                <li>• Auto-grader will validate within 10 minutes of submission.</li>
              </ul>
            </GlassCard>
          </GlassCard>
        </div>

        {/* Right — Submission */}
        <GlassCard className={styles.submissionCard}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>🚀 Submit Work</h2>
          <Badge tone={submitted ? 'success' : 'pink'}>
            {submitted ? 'SUBMITTED ✓' : 'DUE IN 48 HOURS ⏰'}
          </Badge>

          {submitted ? (
            <div className={styles.successBlock}>
              <div className={styles.successIcon}>✓</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Submission Received!</h3>
              <p style={{ color: 'var(--nx-fg-muted)', fontSize: '0.9rem' }}>
                Submitted at {submittedAt}. Faculty grading queue notified.
              </p>
              <div className={styles.xpBadge}>+250 XP unlocks after instructor verification!</div>
              <Button variant="ghost" size="sm" onClick={() => setSubmitted(false)} style={{ marginTop: '8px', color: 'var(--nx-fg-muted)' }}>
                Update / Resubmit
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
              {mutation.isError && (
                <div className={styles.alertDanger}>
                  ⚠️ {mutation.error instanceof Error ? mutation.error.message : 'Submission failed'}
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>GitHub / CodeSandbox URL</label>
                <input
                  type="url"
                  className={`${styles.input} ${errors.githubUrl ? styles.inputError : ''}`}
                  placeholder="https://github.com/username/project"
                  {...register('githubUrl')}
                />
                {errors.githubUrl && <span className={styles.fieldError}>⚠ {errors.githubUrl.message}</span>}
              </div>

              {/* File drop zone */}
              <div
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) setFile(f)
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".py,.glsl,.zip,.ts,.js"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📁</div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.92rem' }}>
                  {file ? file.name : 'Drag & drop lab files here'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--nx-fg-muted)', marginTop: '4px' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB — click to change` : '.py / .glsl / .zip / .ts'}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Notes for Instructor <span style={{ color: 'var(--nx-fg-muted)' }}>(optional)</span></label>
                <textarea
                  rows={3}
                  className={styles.input}
                  placeholder="Describe extra features or custom shaders implemented…"
                  {...register('notes')}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <Button
                magnetic glow
                type="submit"
                disabled={mutation.isPending || (!githubUrl && !file)}
                style={{ padding: '14px', fontSize: '1rem', width: '100%' }}
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Assignment ⚡'}
              </Button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './AssignmentPage.module.css'

export function AssignmentPage() {
  const { assessmentId = 'mock-1' } = useParams<{ assessmentId: string }>()

  const [githubUrl, setGithubUrl] = useState('')
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  const handleSubmission = (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    setSubmittedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.topBar}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
          <span>/</span>
          <span>Assignments</span>
          <span>/</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{assessmentId === 'mock-1' ? 'Neural Control Lab Submission' : 'Lab Assignment'}</span>
        </div>

        <Badge tone={isSubmitted ? 'success' : 'pink'}>
          {isSubmitted ? 'SUBMITTED ✓ (Pending Grade)' : 'DUE IN 48 HOURS ⏰'}
        </Badge>
      </div>

      <div className={styles.layout}>
        {/* Left: Assignment Brief & Rubric */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <GlassCard elevation="raised" glow className={styles.mainCard}>
            <div>
              <Badge tone="cyan" style={{ marginBottom: '10px' }}>100 Points Possible • +250 XP Reward</Badge>
              <h1 className={styles.title}>Neural Control Lab Submission</h1>
              <p className={styles.desc} style={{ marginTop: '12px' }}>
                In this assignment, you will implement the Jacobian inverse kinematics calculation in Python and connect it to the WebGL shader visualizer. Your code must successfully compute angle velocities without gimbal lock.
              </p>
            </div>

            <div className={styles.rubricBox}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>📋 Grading Rubric (100 pts)</h3>
              <div className={styles.rubricItem}>
                <span>Jacobian Matrix Calculation Accuracy</span>
                <strong>40 pts</strong>
              </div>
              <div className={styles.rubricItem}>
                <span>60 FPS WebGL Shader Integration</span>
                <strong>30 pts</strong>
              </div>
              <div className={styles.rubricItem}>
                <span>Clean Code Structure & Documentation</span>
                <strong>20 pts</strong>
              </div>
              <div className={styles.rubricItem}>
                <span>Boundary Condition Handling</span>
                <strong>10 pts</strong>
              </div>
            </div>
          </GlassCard>

          {/* Instructor Feedback or Guidelines */}
          <GlassCard style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
              💡 Submission Instructions
            </h3>
            <ul style={{ color: 'var(--nx-fg-muted)', fontSize: '0.92rem', lineHeight: '1.6', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Ensure your GitHub repository or Gist is public or accessible to instructors.</li>
              <li>Include your compiled `.cif` or `.glsl` shader files inside the root directory.</li>
              <li>Once submitted, our automated grading engine will perform initial validation within 10 minutes.</li>
            </ul>
          </GlassCard>
        </div>

        {/* Right: Submission Portal */}
        <Reveal>
          <RevealItem>
            <GlassCard className={styles.submissionCard}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                🚀 Student Submission
              </h2>

              {isSubmitted ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.18)', border: '2px solid var(--nx-success)', color: 'var(--nx-success)', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    ✓
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>Submission Received!</h3>
                  <p style={{ color: 'var(--nx-fg-muted)', fontSize: '0.9rem' }}>
                    Submitted at {submittedAt}. Our faculty grading queue has received your lab submission.
                  </p>
                  <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem', color: 'var(--nx-accent-cyan)' }}>
                    +250 XP will unlock upon instructor verification!
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsSubmitted(false)} style={{ marginTop: '10px' }}>
                    Update / Resubmit
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmission} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--nx-fg)', marginBottom: '8px' }}>
                      GitHub Repository / Gist URL
                    </label>
                    <input
                      type="url"
                      required
                      className={styles.inputField}
                      placeholder="https://github.com/username/neural-control-lab"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                    />
                  </div>

                  <div className={styles.dropZone}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📁</div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>Drag & drop lab files here</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--nx-fg-muted)', marginTop: '4px' }}>or click to browse local `.py` / `.glsl` files</div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'var(--nx-fg)', marginBottom: '8px' }}>
                      Notes for Instructor (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className={styles.inputField}
                      placeholder="Mention any extra features or custom shaders implemented..."
                      value={submissionNotes}
                      onChange={(e) => setSubmissionNotes(e.target.value)}
                    />
                  </div>

                  <Button magnetic glow type="submit" style={{ padding: '14px', fontSize: '1rem', width: '100%', marginTop: '6px' }}>
                    Submit Assignment ⚡
                  </Button>
                </form>
              )}
            </GlassCard>
          </RevealItem>
        </Reveal>
      </div>
    </div>
  )
}

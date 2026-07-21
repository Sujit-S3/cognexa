import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard, Badge, Button } from '../../design'
import styles from './QuizPage.module.css'

// ── Question bank ───────────────────────────────────────────────────────────
interface Question {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  points: number
}

const QUIZ_BANK: Record<string, Question[]> = {
  default: [
    {
      id: 1,
      question: 'Which mathematical construct is used to compute inverse kinematics without gimbal lock?',
      options: ['Euler Angles', 'Quaternion algebra', 'Rotation Matrices only', 'Linear Interpolation'],
      correctIndex: 1,
      explanation:
        'Quaternions represent rotation in 4D space, avoiding the singularity (gimbal lock) inherent to 3D Euler angle representation.',
      points: 35,
    },
    {
      id: 2,
      question:
        'In GLSL, which built-in function returns the fractional part of a float for procedural shader patterns?',
      options: ['floor()', 'mod()', 'fract()', 'clamp()'],
      correctIndex: 2,
      explanation:
        'fract(x) returns x - floor(x), producing repeating [0,1) patterns essential for procedural textures and noise functions.',
      points: 35,
    },
    {
      id: 3,
      question: 'What is the time complexity of the Bellman–Ford shortest path algorithm?',
      options: ['O(V log V)', 'O(V + E)', 'O(V × E)', 'O(E log V)'],
      correctIndex: 2,
      explanation:
        'Bellman–Ford runs V−1 edge relaxation passes, each taking O(E) time, giving O(V×E) overall — slower but handles negative edge weights.',
      points: 30,
    },
  ],
}

const QUIZ_TITLE: Record<string, string> = {
  'mock-2': 'WebGL Shader Midterm',
}

const TIMER_SECS = 300 // 5 minutes

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function QuizPage() {
  const { assessmentId = 'mock-2' } = useParams<{ assessmentId: string }>()
  const questions = QUIZ_BANK[assessmentId] ?? QUIZ_BANK.default
  const title = QUIZ_TITLE[assessmentId] ?? `Quiz ${assessmentId}`

  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [done, setDone] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECS)

  const q = questions[current]
  const totalPoints = questions.reduce((a, q) => a + q.points, 0)
  const earnedPoints = questions.reduce((sum, q, idx) => {
    const pick = selected[idx]
    return pick === q.correctIndex ? sum + q.points : sum
  }, 0)

  const submit = useCallback(() => setDone(true), [])

  // Timer countdown
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          submit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done, submit])

  const handleSelect = (optIdx: number) => {
    if (revealed[current]) return
    setSelected((prev) => ({ ...prev, [current]: optIdx }))
  }

  const handleReveal = () => {
    if (selected[current] === undefined) return
    setRevealed((prev) => ({ ...prev, [current]: true }))
  }

  const pct = Math.round((earnedPoints / totalPoints) * 100)

  // ── Results ─────────────────────────────────────────────────────────────────
  if (done) {
    const grade = pct >= 85 ? 'A' : pct >= 70 ? 'B' : pct >= 55 ? 'C' : 'D'
    const xp = pct >= 85 ? 300 : pct >= 70 ? 200 : pct >= 55 ? 100 : 50
    return (
      <div className={styles.container}>
        <GlassCard elevation="raised" glow className={styles.resultsCard}>
          <div style={{ fontSize: '4rem', margin: '0 auto 8px' }}>
            {pct >= 85 ? '🏆' : pct >= 70 ? '🎉' : '📚'}
          </div>
          <Badge tone={pct >= 85 ? 'success' : pct >= 55 ? 'violet' : 'pink'} style={{ margin: '0 auto' }}>
            Grade {grade} — {pct}%
          </Badge>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '10px' }}>
            {pct >= 85
              ? 'Outstanding!'
              : pct >= 70
                ? 'Well Done!'
                : pct >= 55
                  ? 'Good Effort!'
                  : 'Keep Practicing!'}
          </h2>
          <p style={{ color: 'var(--nx-fg-muted)', marginBottom: '16px' }}>
            You scored{' '}
            <strong style={{ color: '#fff' }}>
              {earnedPoints}/{totalPoints}
            </strong>{' '}
            on the {title}.
          </p>
          <div className={styles.xpBadge}>+{xp} XP Awarded 🚀</div>

          {/* Per-question review */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            {questions.map((q, idx) => {
              const pick = selected[idx]
              const correct = pick === q.correctIndex
              return (
                <GlassCard key={q.id} style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                      Q{idx + 1}: {q.question}
                    </span>
                    <Badge tone={correct ? 'success' : 'pink'}>
                      {correct ? `+${q.points} pts` : '0 pts'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--nx-fg-muted)' }}>
                    <span style={{ color: correct ? '#34d399' : '#f43f5e' }}>
                      Your answer: {pick !== undefined ? q.options[pick] : '(skipped)'}
                    </span>
                  </div>
                  {!correct && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--nx-success)', marginTop: '4px' }}>
                      ✓ Correct: {q.options[q.correctIndex]}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255,255,255,0.4)',
                      marginTop: '6px',
                      borderTop: '1px solid rgba(255,255,255,0.07)',
                      paddingTop: '6px',
                    }}
                  >
                    💡 {q.explanation}
                  </div>
                </GlassCard>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setCurrent(0)
                setSelected({})
                setRevealed({})
                setDone(false)
                setTimeLeft(TIMER_SECS)
              }}
            >
              Retry Quiz
            </Button>
            <Link to="/dashboard">
              <Button magnetic glow>
                Back to Dashboard ⚡
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ── Quiz engine ─────────────────────────────────────────────────────────────
  const progress = ((current + 1) / questions.length) * 100
  const isAnswered = selected[current] !== undefined
  const isRevealedNow = revealed[current]
  const isCorrect = selected[current] === q.correctIndex

  return (
    <div className={styles.container}>
      {/* Header bar */}
      <div className={styles.quizHeader}>
        <div>
          <h1 className={styles.quizTitle}>{title}</h1>
          <div style={{ fontSize: '0.84rem', color: 'var(--nx-fg-muted)' }}>
            Question {current + 1} of {questions.length}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Badge
            tone={timeLeft < 60 ? 'pink' : 'cyan'}
            style={{ fontFamily: 'var(--nx-font-mono, monospace)', fontSize: '1rem', padding: '6px 14px' }}
          >
            ⏱ {fmtTime(timeLeft)}
          </Badge>
          <Button variant="secondary" size="sm" onClick={submit}>
            Submit Now
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <GlassCard elevation="raised" glow className={styles.questionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <Badge tone="violet">Q{current + 1}</Badge>
          <Badge tone="brand">{q.points} pts</Badge>
        </div>

        <h2 className={styles.questionText}>{q.question}</h2>

        <div className={styles.optionsList}>
          {q.options.map((opt, idx) => {
            let tone = ''
            if (isRevealedNow) {
              if (idx === q.correctIndex) tone = styles.optionCorrect
              else if (idx === selected[current]) tone = styles.optionWrong
            } else if (selected[current] === idx) {
              tone = styles.optionSelected
            }
            return (
              <button
                key={idx}
                className={`${styles.option} ${tone}`}
                onClick={() => handleSelect(idx)}
                disabled={isRevealedNow}
              >
                <span className={styles.optionLabel}>{String.fromCharCode(65 + idx)}</span>
                {opt}
              </button>
            )
          })}
        </div>

        {isRevealedNow && (
          <div
            className={`${styles.explanation} ${isCorrect ? styles.explanationGood : styles.explanationBad}`}
          >
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'} — {q.explanation}
          </div>
        )}

        <div className={styles.quizFooter}>
          <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            ← Previous
          </Button>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isRevealedNow && isAnswered && (
              <Button variant="ghost" onClick={handleReveal} style={{ color: 'var(--nx-accent-cyan)' }}>
                Check Answer 💡
              </Button>
            )}
            {current < questions.length - 1 ? (
              <Button magnetic glow onClick={() => setCurrent((c) => c + 1)}>
                Next Question →
              </Button>
            ) : (
              <Button magnetic glow onClick={submit}>
                Finish Quiz 🏆
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Mini progress map */}
      <div className={styles.dotMap}>
        {questions.map((_, idx) => (
          <button
            key={idx}
            className={`${styles.dot} ${idx === current ? styles.dotCurrent : ''} ${selected[idx] !== undefined ? (selected[idx] === questions[idx].correctIndex && revealed[idx] ? styles.dotCorrect : revealed[idx] ? styles.dotWrong : styles.dotAnswered) : ''}`}
            onClick={() => setCurrent(idx)}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

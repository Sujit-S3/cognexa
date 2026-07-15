import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './QuizPage.module.css'

interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Why are inverse kinematics calculations typically offloaded or optimized using the Jacobian matrix in robotic control?',
    options: [
      'Because it eliminates the need for any joint sensors.',
      'It linearly approximates velocity mapping between joint angles and end-effector coordinates.',
      'It automatically increases battery capacity by 50%.',
      'It prevents all network latency between the robot and server.',
    ],
    correctIndex: 1,
    explanation: 'Correct! The Jacobian matrix linearizes the non-linear forward kinematics equation, allowing rapid iterative convergence toward target positions without freezing the main control loop.',
  },
  {
    id: 2,
    question: 'When implementing custom GLSL fragment shaders in Three.js, which built-in variable dictates the screen coordinate of the pixel being rendered?',
    options: [
      'gl_Position',
      'gl_FragCoord',
      'u_resolution',
      'gl_VertexID',
    ],
    correctIndex: 1,
    explanation: 'Spot on! gl_FragCoord contains the window-relative coordinates (x, y, z, 1/w) of the current fragment inside the GPU pipeline.',
  },
  {
    id: 3,
    question: 'How does TanStack Query optimize datafetching across our NEXUS AI React 19 components?',
    options: [
      'By replacing the entire Express backend with local JSON files.',
      'By caching server state, deduplicating simultaneous requests, and providing instant optimistic updates.',
      'By converting all TypeScript types into plain CSS variables.',
      'By disabling all browser local storage.',
    ],
    correctIndex: 1,
    explanation: 'Exactly! TanStack Query manages server state asynchronously with automatic stale-while-revalidate caching and deduplication.',
  },
]

export function QuizPage() {
  const { assessmentId = 'mock-2' } = useParams<{ assessmentId: string }>()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentQ = QUESTIONS[currentIndex] || QUESTIONS[0]
  const totalQ = QUESTIONS.length

  const handleSelectOption = (index: number) => {
    if (isAnswered) return
    setSelectedOption(index)
    setIsAnswered(true)
    if (index === currentQ.correctIndex) {
      setScore((s) => s + 1)
    }
  }

  const handleNextQuestion = () => {
    if (currentIndex + 1 < totalQ) {
      setCurrentIndex((i) => i + 1)
      setSelectedOption(null)
      setIsAnswered(false)
    } else {
      setIsFinished(true)
    }
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setScore(0)
    setIsFinished(false)
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.topBar}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
          <span>/</span>
          <span>Assessments</span>
          <span>/</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{assessmentId === 'mock-2' ? 'Midterm WebGL Shader Exam' : 'Interactive Quiz'}</span>
        </div>

        <Badge tone="violet">
          {isFinished ? 'EXAM COMPLETED 🎉' : `Question ${currentIndex + 1} of ${totalQ}`}
        </Badge>
      </div>

      {isFinished ? (
        <Reveal>
          <RevealItem>
            <GlassCard elevation="raised" glow className={styles.resultCard}>
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', border: '3px solid var(--nx-brand-400)', color: '#fff', fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🏆
              </div>
              <div>
                <Badge tone="success" style={{ marginBottom: '12px' }}>+300 XP Awarded 🌟</Badge>
                <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>
                  Score: {Math.round((score / totalQ) * 100)}% ({score} / {totalQ})
                </h1>
                <p style={{ color: 'var(--nx-fg-muted)', fontSize: '1.05rem', maxWidth: '500px', margin: '12px auto 0' }}>
                  Incredible mastery! Your quiz performance has been recorded to your student transcript and contributed to your weekly leaderboard rank.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
                <Button variant="secondary" onClick={handleRestart}>
                  Retake Quiz 🔄
                </Button>
                <Link to="/dashboard">
                  <Button magnetic glow>
                    Return to Dashboard ⚡
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </RevealItem>
        </Reveal>
      ) : (
        <GlassCard elevation="raised" className={styles.quizCard}>
          {/* Progress Header */}
          <div>
            <div className={styles.progressHeader}>
              <span>⚡ Gamified Assessment Engine</span>
              <span>{Math.round(((currentIndex) / totalQ) * 100)}% Completed</span>
            </div>
            <div className={styles.progressBar} style={{ marginTop: '10px' }}>
              <div className={styles.progressFill} style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / totalQ) * 100}%` }} />
            </div>
          </div>

          <h2 className={styles.questionTitle}>{currentQ.question}</h2>

          {/* Options Grid */}
          <div className={styles.optionsGrid}>
            {currentQ.options.map((opt, idx) => {
              let btnClass = styles.optionBtn
              if (isAnswered) {
                if (idx === currentQ.correctIndex) {
                  btnClass = `${styles.optionBtn} ${styles.optionCorrect}`
                } else if (idx === selectedOption) {
                  btnClass = `${styles.optionBtn} ${styles.optionWrong}`
                }
              } else if (idx === selectedOption) {
                btnClass = `${styles.optionBtn} ${styles.optionSelected}`
              }

              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isAnswered && idx === currentQ.correctIndex && <span>✓ Correct</span>}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correctIndex && <span>✕ Incorrect</span>}
                </button>
              )
            })}
          </div>

          {/* Explanation Box when Answered */}
          {isAnswered && (
            <Reveal>
              <RevealItem>
                <div className={styles.explanationBox}>
                  <div style={{ fontWeight: 800, color: '#fff', marginBottom: '4px' }}>💡 AI Architect Explanation:</div>
                  <div>{currentQ.explanation}</div>
                </div>
              </RevealItem>
            </Reveal>
          )}

          {/* Next Button */}
          {isAnswered && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Button magnetic glow onClick={handleNextQuestion} style={{ padding: '14px 28px', fontSize: '1rem' }}>
                {currentIndex + 1 < totalQ ? 'Next Question →' : 'View Final Score 🏆'}
              </Button>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}

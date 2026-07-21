import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './VideoPlayerPage.module.css'

interface PlaylistLecture {
  id: string
  title: string
  duration: string
  xp: number
  completed: boolean
}

export function VideoPlayerPage() {
  const { courseId = 'demo-ai', itemId = 'lec-1' } = useParams<{ courseId: string; itemId: string }>()

  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [progressPercent, setProgressPercent] = useState(38)
  const [activeTab, setActiveTab] = useState<'notes' | 'sandbox' | 'transcript'>('notes')
  const [notesText, setNotesText] = useState(
    '// Personal Lecture Notes — Auto-saved to Cognexa Cloud\n\n- Kinematic chains require exact Jacobian matrix computation.\n- Shaders run on GPU fragment pipelines, allowing 60 FPS feedback loops.\n'
  )

  const [playlist, setPlaylist] = useState<PlaylistLecture[]>([
    {
      id: 'lec-1',
      title: '1.1 Setting up Scene, Camera, and WebGLRenderer',
      duration: '14:20',
      xp: 150,
      completed: true,
    },
    {
      id: 'lec-2',
      title: '1.2 Custom Geometry and PBR Materials Lab',
      duration: '22:15',
      xp: 200,
      completed: false,
    },
    {
      id: 'lec-3',
      title: '2.1 Vertex vs Fragment Shaders Fundamentals',
      duration: '18:45',
      xp: 150,
      completed: false,
    },
    {
      id: 'lec-4',
      title: '2.2 Interactive Fluid & Ripple Shaders',
      duration: '26:10',
      xp: 250,
      completed: false,
    },
  ])

  const currentLecture = playlist.find((p) => p.id === itemId) || playlist[0]

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    if (isPlaying) {
      timer = setInterval(() => {
        setProgressPercent((prev) => (prev >= 100 ? 100 : prev + 0.5 * speed))
      }, 500)
    }
    return () => clearInterval(timer)
  }, [isPlaying, speed])

  const handleMarkCompleted = (id: string) => {
    setPlaylist((prev) => prev.map((l) => (l.id === id ? { ...l, completed: true } : l)))
    setProgressPercent(100)
    setIsPlaying(false)
  }

  const cycleSpeed = () => {
    if (speed === 1) setSpeed(1.5)
    else if (speed === 1.5) setSpeed(2)
    else setSpeed(1)
  }

  return (
    <div className={styles.container}>
      {/* Top Bar / Breadcrumb */}
      <div className={styles.topBar}>
        <div className={styles.breadcrumb}>
          <Link to="/dashboard" className={styles.breadcrumbLink}>
            Dashboard
          </Link>
          <span>/</span>
          <Link to={`/courses/${courseId}`} className={styles.breadcrumbLink}>
            Course Syllabus
          </Link>
          <span>/</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{currentLecture.title}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Badge tone={currentLecture.completed ? 'success' : 'brand'}>
            {currentLecture.completed ? 'Completed ✓' : `+${currentLecture.xp} XP Avail`}
          </Badge>
          <Button
            magnetic
            glow={!currentLecture.completed}
            tone={currentLecture.completed ? 'neutral' : 'success'}
            onClick={() => handleMarkCompleted(currentLecture.id)}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            {currentLecture.completed ? 'Lecture Finished 🎉' : 'Mark Completed (+150 XP) ⚡'}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className={styles.layout}>
        {/* Left: Video Viewport & Lecture Details */}
        <div className={styles.playerSection}>
          <GlassCard className={styles.viewportCard}>
            <div className={styles.videoContainer}>
              <div className={styles.simulationCanvas}>
                <Badge tone="cyan" style={{ marginBottom: '12px' }}>
                  Interactive GPU / AI Visualizer
                </Badge>
                <h3
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: '#fff',
                    maxWidth: '600px',
                    margin: '0 auto 12px',
                  }}
                >
                  {currentLecture.title}
                </h3>
                <p
                  style={{
                    color: 'var(--nx-fg-muted)',
                    fontSize: '0.92rem',
                    maxWidth: '500px',
                    margin: '0 auto 24px',
                  }}
                >
                  Live WebGL particle simulation running at 60 FPS in browser sandbox. Click play to begin
                  lecture narration.
                </p>

                <div className={styles.playOverlay} onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? '⏸' : '▶'}
                </div>
              </div>
            </div>

            {/* Scrubber & Controls */}
            <div className={styles.controlsBar}>
              <div
                className={styles.scrubber}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100)
                  setProgressPercent(pct)
                }}
              >
                <div className={styles.scrubberFill} style={{ width: `${progressPercent}%` }} />
              </div>

              <div className={styles.buttonsRow}>
                <div className={styles.ctrlGroup}>
                  <button className={styles.ctrlIconBtn} onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--nx-fg-muted)' }}>
                    {Math.round((progressPercent / 100) * 18)}:20 / {currentLecture.duration}
                  </span>
                </div>

                <div className={styles.ctrlGroup}>
                  <button className={styles.speedChip} onClick={cycleSpeed}>
                    Speed: {speed}x ⚡
                  </button>
                  <Badge tone="violet" style={{ fontSize: '0.75rem' }}>
                    1080p HD
                  </Badge>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Tabs: Notes, Sandbox, Transcript */}
          <GlassCard style={{ padding: '24px' }}>
            <div className={styles.tabsRow}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'notes' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('notes')}
              >
                📝 Cloud Lecture Notes
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'sandbox' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('sandbox')}
              >
                💻 Live Code Sandbox
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'transcript' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('transcript')}
              >
                📜 AI Transcript & Search
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              {activeTab === 'notes' && (
                <div>
                  <textarea
                    className={styles.notesArea}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Type your notes here..."
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '10px',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--nx-success)' }}>
                      ✓ Auto-saved 2s ago
                    </span>
                    <Button variant="ghost" size="sm">
                      Export as Markdown (.md)
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'sandbox' && (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: '#090d16',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: 'monospace',
                    color: '#38bdf8',
                  }}
                >
                  <div style={{ color: 'var(--nx-fg-muted)', marginBottom: '8px' }}>
                    // Live Shader Playground (Fragment Output)
                  </div>
                  <div>void main() &#123;</div>
                  <div style={{ paddingLeft: '20px' }}>vec2 uv = gl_FragCoord.xy / u_resolution.xy;</div>
                  <div style={{ paddingLeft: '20px', color: '#f43f5e' }}>
                    gl_FragColor = vec4(uv.x, uv.y, 1.0, 1.0);
                  </div>
                  <div>&#125;</div>
                  <Button magnetic glow size="sm" style={{ marginTop: '16px' }}>
                    Run Shader in Canvas ⚡
                  </Button>
                </div>
              )}

              {activeTab === 'transcript' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    fontSize: '0.9rem',
                    color: 'var(--nx-fg-muted)',
                    lineHeight: '1.6',
                  }}
                >
                  <div>
                    <strong style={{ color: '#fff' }}>[00:15]</strong> Welcome everyone. Today we are setting
                    up our high-performance WebGL renderer inside React 19 using custom tokens.
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>[03:42]</strong> Notice how our Jacobian matrix allows
                    instant inverse kinematics calculation without blocking the main browser thread.
                  </div>
                  <div>
                    <strong style={{ color: '#fff' }}>[11:05]</strong> When we apply the physics spring
                    damping, the button pulls toward the cursor with natural momentum.
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right: Playlist & Curriculum Navigation */}
        <div className={styles.sidebar}>
          <GlassCard style={{ padding: '24px' }}>
            <div className={styles.sidebarHeader}>
              <span>📑 Module Playlist</span>
              <Badge tone="cyan">
                {playlist.filter((p) => p.completed).length} / {playlist.length} Done
              </Badge>
            </div>

            <Reveal className={styles.playlist} style={{ marginTop: '16px' }}>
              {playlist.map((item) => {
                const isCurrent = item.id === itemId
                return (
                  <RevealItem key={item.id}>
                    <Link to={`/courses/${courseId}/learn/${item.id}`} style={{ textDecoration: 'none' }}>
                      <div className={`${styles.playlistItem} ${isCurrent ? styles.playlistItemActive : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: item.completed
                                ? 'var(--nx-success)'
                                : isCurrent
                                  ? 'var(--nx-brand-400)'
                                  : 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              color: '#fff',
                              fontWeight: 800,
                            }}
                          >
                            {item.completed ? '✓' : isCurrent ? '▶' : ''}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                fontWeight: isCurrent ? 800 : 600,
                                color: isCurrent ? '#fff' : 'var(--nx-fg)',
                              }}
                            >
                              {item.title}
                            </div>
                            <div
                              style={{ fontSize: '0.78rem', color: 'var(--nx-fg-muted)', marginTop: '2px' }}
                            >
                              ⏱️ {item.duration} • +{item.xp} XP
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </RevealItem>
                )
              })}
            </Reveal>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}

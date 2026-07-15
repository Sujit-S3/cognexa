import { useState } from 'react'
import { GlassCard, Reveal, Badge, Button } from '../design'
import styles from './ProgressDemo.module.css'
import studentAvatarImg from '../assets/student_avatar.png'

interface Quest {
  id: number
  title: string
  reward: number
  done: boolean
}

export function ProgressDemo() {
  const [quests, setQuests] = useState<Quest[]>([
    { id: 1, title: 'Complete AI Neural Network Quiz #3', reward: 250, done: true },
    { id: 2, title: 'Watch 3D WebGL Physics Lecture', reward: 180, done: false },
    { id: 3, title: 'Review 15 Spaced-Repetition Flashcards', reward: 120, done: false },
    { id: 4, title: 'Submit Code Review for Assignment 2', reward: 350, done: false },
  ])

  const [aiBoostActive, setAiBoostActive] = useState(false)

  const completedCount = quests.filter((q) => q.done).length
  const totalXP = quests.reduce((acc, q) => (q.done ? acc + q.reward * (aiBoostActive ? 2 : 1) : acc), 1240)
  const progressPercent = Math.min(100, Math.round((totalXP / 2500) * 100))
  const level = Math.floor(totalXP / 500) + 12
  const streak = 14 + (completedCount > 1 ? 1 : 0)

  const toggleQuest = (id: number) => {
    setQuests((prev) =>
      prev.map((q) => (q.id === id ? { ...q, done: !q.done } : q))
    )
  }

  return (
    <section className={styles.section} id="progress">
      <Reveal className={styles.header}>
        <Badge tone="cyan">Gamified Mastery</Badge>
        <h2 className={styles.title}>
          Learning that feels like an <span className="nx-gradient-text">Addictive Game</span>
        </h2>
        <p className={styles.subtitle}>
          Click the quests below to experience NEXUS AI’s real-time XP engine, dynamic level progression,
          and daily study streak multiplier in action right now!
        </p>
      </Reveal>

      <Reveal className={styles.demoContainer}>
        <GlassCard elevation="raised" glow={aiBoostActive} className={styles.cardLeft}>
          <div className={styles.cardHeader}>
            <div className={styles.studentInfo}>
              <div className={styles.avatarWrap}>
                <img src={studentAvatarImg} alt="Student Avatar" className={styles.avatarImg} />
              </div>
              <div>
                <h3 className={styles.studentName}>Alex Chen</h3>
                <span className={styles.studentLevel}>Level {level} • AI Scholar</span>
              </div>
            </div>

            <div className={styles.streakBadge}>
              <span>🔥</span> {streak} Days
            </div>
          </div>

          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Level {level} Mastery Progress</span>
              <span className={styles.progressValue}>
                {totalXP} / 2500 XP ({progressPercent}%)
              </span>
            </div>
            <div className={styles.progressBarWrap}>
              <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className={styles.heatmap}>
            <span className={styles.heatmapTitle}>2-Week Study Heatmap (Active Activity)</span>
            <div className={styles.heatmapGrid}>
              {Array.from({ length: 14 }).map((_, i) => {
                const isActive = i < 11 || (i === 11 && completedCount >= 1) || (i === 12 && completedCount >= 2) || (i === 13 && completedCount >= 3)
                const isBoost = aiBoostActive && isActive && i >= 11
                return (
                  <div
                    key={i}
                    className={`${styles.heatmapBox} ${isActive ? styles.heatmapActive : ''} ${isBoost ? styles.heatmapBoost : ''}`}
                    title={`Day ${i + 1}: ${isActive ? 'Study goal completed!' : 'Rest day'}`}
                  />
                )
              })}
            </div>
          </div>
        </GlassCard>

        <GlassCard elevation="raised" className={styles.cardRight}>
          <div className={styles.questSection}>
            <div className={styles.questTitle}>
              <span>🎯</span> Today&apos;s Interactive Daily Quests
            </div>

            <div className={styles.questList}>
              {quests.map((q) => (
                <div
                  key={q.id}
                  className={`${styles.questItem} ${q.done ? styles.questItemDone : ''}`}
                  onClick={() => toggleQuest(q.id)}
                >
                  <div className={styles.questLeft}>
                    <div className={`${styles.checkbox} ${q.done ? styles.checkboxDone : ''}`}>
                      {q.done ? '✓' : ''}
                    </div>
                    <span className={`${styles.questText} ${q.done ? styles.questTextDone : ''}`}>
                      {q.title}
                    </span>
                  </div>
                  <span className={styles.questReward}>
                    +{q.reward * (aiBoostActive ? 2 : 1)} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.boosterBar}>
            <div className={styles.boosterText}>
              <span className={styles.boosterTitle}>
                {aiBoostActive ? '⚡ 2x AI Speed Multiplier ACTIVE!' : '⚡ Activate AI 2x XP Multiplier'}
              </span>
              <span className={styles.boosterSub}>
                {aiBoostActive ? 'All completed quests yield double rewards today!' : 'Double your daily study gains instantly'}
              </span>
            </div>
            <Button
              size="sm"
              variant={aiBoostActive ? 'secondary' : 'primary'}
              onClick={() => setAiBoostActive(!aiBoostActive)}
            >
              {aiBoostActive ? 'Boost Active' : 'Boost XP'}
            </Button>
          </div>
        </GlassCard>
      </Reveal>
    </section>
  )
}

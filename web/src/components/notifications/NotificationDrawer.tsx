import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard, Badge, Button } from '../../design'
import styles from './NotificationDrawer.module.css'

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  type: 'Grade' | 'Quest' | 'System' | 'Course'
  unread: boolean
  link?: string
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Grade Posted: Neural Control Lab',
    message: 'Your assignment has been graded by faculty. You scored 98/100 (+250 XP Awarded!) 🎉',
    time: '10m ago',
    type: 'Grade',
    unread: true,
    link: '/assessments/assignments/mock-1',
  },
  {
    id: 'notif-2',
    title: 'Daily Streak Alert 🔥',
    message: 'You have a 7-day streak going! Complete 1 lecture today to keep your fire active.',
    time: '2h ago',
    type: 'Quest',
    unread: true,
    link: '/dashboard',
  },
  {
    id: 'notif-3',
    title: 'New Course Curriculum Published 🚀',
    message: 'Dr. Vance just released "Distributed Systems & Cloud Scale AI". Check out the new syllabus.',
    time: '1d ago',
    type: 'Course',
    unread: false,
    link: '/catalog',
  },
]

interface NotificationDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)

  if (!isOpen) return null

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })))
  }

  const clearAll = () => {
    setItems([])
  }

  const unreadCount = items.filter((i) => i.unread).length

  return (
    <div className={styles.overlay} onClick={onClose}>
      <GlassCard className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span>🔔 Notifications</span>
            {unreadCount > 0 && <Badge tone="brand">{unreadCount} New</Badge>}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <div style={{ fontSize: '2.5rem' }}>📭</div>
            <div style={{ fontWeight: 700, color: '#fff' }}>No new notifications</div>
            <div style={{ fontSize: '0.86rem' }}>You are all caught up with alerts!</div>
          </div>
        ) : (
          <div className={styles.feed}>
            {items.map((item) => (
              <div key={item.id} className={`${styles.item} ${item.unread ? styles.itemUnread : ''}`}>
                <div className={styles.itemTop}>
                  <Badge
                    tone={item.type === 'Grade' ? 'success' : item.type === 'Quest' ? 'pink' : 'cyan'}
                    style={{ fontSize: '0.72rem' }}
                  >
                    {item.type}
                  </Badge>
                  <span>{item.time}</span>
                </div>
                <div className={styles.itemTitle}>{item.title}</div>
                <div className={styles.itemMsg}>{item.message}</div>
                {item.link && (
                  <Link to={item.link} onClick={onClose} style={{ textDecoration: 'none', marginTop: '4px' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{ color: 'var(--nx-accent-cyan)', padding: '0', fontSize: '0.84rem' }}
                    >
                      View Details →
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '10px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Button
            variant="secondary"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            style={{ flex: 1, fontSize: '0.86rem', padding: '10px' }}
          >
            Mark All Read ✓
          </Button>
          <Button
            variant="ghost"
            onClick={clearAll}
            disabled={items.length === 0}
            style={{ color: 'var(--nx-fg-muted)', fontSize: '0.86rem' }}
          >
            Clear All
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}

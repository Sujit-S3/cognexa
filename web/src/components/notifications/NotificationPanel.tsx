import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type NotificationView } from '../../services/api'
import { GlassCard, Badge } from '../../design'
import styles from './NotificationPanel.module.css'

const typeLabel: Record<NotificationView['type'], string> = {
  quiz_graded: 'Quiz graded',
  assignment_graded: 'Assignment graded',
  certificate_issued: 'Certificate earned',
}

export function NotificationPanel({ onClose, onRead }: { onClose: () => void; onRead: () => void }) {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: notificationsApi.getAll,
  })

  const invalidate = () => {
    onRead()
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
  }

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: invalidate,
  })
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: invalidate,
  })

  return (
    <GlassCard elevation="raised" className={styles.panel} role="dialog" aria-label="Notifications">
      <div className={styles.header}>
        <h2>Notifications</h2>
        {items.some((item) => !item.read) && (
          <button
            type="button"
            className={styles.markAllButton}
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <p className={styles.empty}>Loading...</p>
      ) : items.length === 0 ? (
        <p className={styles.empty}>You&apos;re all caught up.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const content = (
              <>
                <div className={styles.itemHeader}>
                  <Badge tone={item.read ? 'neutral' : 'cyan'}>{typeLabel[item.type]}</Badge>
                  {!item.read && <span className={styles.dot} aria-label="Unread" />}
                </div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </>
            )
            return (
              <li key={item.id} className={styles.item}>
                {item.link ? (
                  <Link
                    to={item.link}
                    className={styles.itemLink}
                    onClick={() => {
                      if (!item.read) markRead.mutate(item.id)
                      onClose()
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.itemLink}
                    disabled={item.read}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </GlassCard>
  )
}

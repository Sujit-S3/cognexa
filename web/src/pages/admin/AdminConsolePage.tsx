import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, RotateCcw, ScrollText, ShieldCheck, Users as UsersIcon } from 'lucide-react'
import {
  adminApi,
  instructorApi,
  type AdminUserView,
  type CourseStatus,
  type UserRole,
} from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { useAuthStore } from '../../stores/authStore'
import styles from './AdminConsolePage.module.css'

type Tab = 'users' | 'courses' | 'audit'

const tabs: Array<{ value: Tab; label: string; icon: typeof UsersIcon }> = [
  { value: 'users', label: 'Users', icon: UsersIcon },
  { value: 'courses', label: 'Courses', icon: ShieldCheck },
  { value: 'audit', label: 'Audit log', icon: ScrollText },
]

const statusTone: Record<CourseStatus, 'neutral' | 'cyan' | 'success' | 'violet'> = {
  draft: 'neutral',
  review: 'cyan',
  published: 'success',
  archived: 'violet',
}

function formatDate(value?: string) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

export function AdminConsolePage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.headerBanner}>
        <div>
          <Badge tone="violet">
            <ShieldCheck size={13} /> Administration
          </Badge>
          <h1>Admin console</h1>
          <p>Manage user access, oversee every course, and review the platform audit trail.</p>
        </div>
      </GlassCard>

      <nav className={styles.tabs} aria-label="Admin console sections">
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.value}
              type="button"
              className={tab === item.value ? styles.tabActive : undefined}
              aria-current={tab === item.value ? 'page' : undefined}
              onClick={() => setTab(item.value)}
            >
              <Icon size={16} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {tab === 'users' && <UsersTab />}
      {tab === 'courses' && <CoursesTab />}
      {tab === 'audit' && <AuditLogTab />}
    </div>
  )
}

function UsersTab() {
  const { user: currentUser } = useAuthStore()
  const currentUserId = currentUser?.id ?? currentUser?._id
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', search, page],
    queryFn: () => adminApi.listUsers({ search: search || undefined, page, limit }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.updateUserStatus(userId, isActive),
    onSuccess: invalidate,
  })
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: invalidate,
  })

  if (usersQuery.isLoading) {
    return (
      <div className={styles.panelLoading} role="status">
        Loading users…
      </div>
    )
  }

  if (usersQuery.isError || !usersQuery.data) {
    return (
      <GlassCard className={styles.errorState}>
        <h2>Could not load users</h2>
        <Button type="button" onClick={() => void usersQuery.refetch()}>
          Try again
        </Button>
      </GlassCard>
    )
  }

  const { users, total } = usersQuery.data
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <GlassCard className={styles.panel}>
      <div className={styles.panelToolbar}>
        <input
          type="search"
          placeholder="Search by name, email, or username"
          aria-label="Search users"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <span>{total} total</span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last seen</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((row: AdminUserView) => {
              const isSelf = row.id === currentUserId
              return (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td>
                    <select
                      aria-label={`Role for ${row.name}`}
                      value={row.role}
                      disabled={isSelf || roleMutation.isPending}
                      onChange={(event) =>
                        roleMutation.mutate({ userId: row.id, role: event.target.value as UserRole })
                      }
                    >
                      <option value="student">student</option>
                      <option value="instructor">instructor</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <Badge tone={row.isActive ? 'success' : 'pink'}>
                      {row.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </td>
                  <td>{formatDate(row.lastSeenAt)}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.rowAction}
                      disabled={isSelf || statusMutation.isPending}
                      title={isSelf ? 'You cannot change your own status' : undefined}
                      onClick={() => statusMutation.mutate({ userId: row.id, isActive: !row.isActive })}
                    >
                      {row.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
        </Button>
      </div>
    </GlassCard>
  )
}

function CoursesTab() {
  const queryClient = useQueryClient()
  const dashboard = useQuery({
    queryKey: ['instructor', 'dashboard'],
    queryFn: instructorApi.getDashboard,
  })

  const transition = useMutation({
    mutationFn: ({ courseId, status }: { courseId: string; status: CourseStatus }) =>
      instructorApi.transitionStatus(courseId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['instructor', 'dashboard'] }),
  })

  if (dashboard.isLoading) {
    return (
      <div className={styles.panelLoading} role="status">
        Loading courses…
      </div>
    )
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <GlassCard className={styles.errorState}>
        <h2>Could not load courses</h2>
        <Button type="button" onClick={() => void dashboard.refetch()}>
          Try again
        </Button>
      </GlassCard>
    )
  }

  return (
    <GlassCard className={styles.panel}>
      <div className={styles.panelToolbar}>
        <span>{dashboard.data.courses.length} courses across the platform</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Course</th>
              <th>Status</th>
              <th>Learners</th>
              <th>Completion</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {dashboard.data.courses.map((course) => {
              const id = course._id ?? course.id ?? ''
              return (
                <tr key={id}>
                  <td>{course.name}</td>
                  <td>
                    <Badge tone={statusTone[course.status]}>{course.status}</Badge>
                  </td>
                  <td>{course.analytics?.studentCount ?? 0}</td>
                  <td>{course.analytics?.completionRate ?? 0}%</td>
                  <td>
                    <button
                      type="button"
                      className={styles.rowAction}
                      disabled={transition.isPending}
                      onClick={() =>
                        transition.mutate({
                          courseId: id,
                          status: course.status === 'archived' ? 'draft' : 'archived',
                        })
                      }
                    >
                      {course.status === 'archived' ? (
                        <>
                          <RotateCcw size={13} /> Restore
                        </>
                      ) : (
                        <>
                          <Archive size={13} /> Archive
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}

function AuditLogTab() {
  const [page, setPage] = useState(1)
  const limit = 50

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit-log', page],
    queryFn: () => adminApi.getAuditLog({ page, limit }),
  })

  if (auditQuery.isLoading) {
    return (
      <div className={styles.panelLoading} role="status">
        Loading audit log…
      </div>
    )
  }

  if (auditQuery.isError || !auditQuery.data) {
    return (
      <GlassCard className={styles.errorState}>
        <h2>Could not load the audit log</h2>
        <Button type="button" onClick={() => void auditQuery.refetch()}>
          Try again
        </Button>
      </GlassCard>
    )
  }

  const { entries, total } = auditQuery.data
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <GlassCard className={styles.panel}>
      <div className={styles.panelToolbar}>
        <span>{total} platform events</span>
      </div>
      {entries.length === 0 ? (
        <p className={styles.muted}>No audit events yet.</p>
      ) : (
        <ul className={styles.auditList}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{entry.action}</strong>
                <span>
                  {entry.actor.name} · {entry.targetType}
                </span>
              </div>
              <small>{formatDate(entry.createdAt)}</small>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.pagination}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
        </Button>
      </div>
    </GlassCard>
  )
}

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Building2, Mail, ScrollText, Users as UsersIcon } from 'lucide-react'
import { coursesApi, organizationsApi, type OrganizationMemberRole } from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { useAuthStore } from '../../stores/authStore'
import styles from './OrganizationDetailPage.module.css'

type Tab = 'members' | 'invitations' | 'assign' | 'progress' | 'audit'

const tabs: Array<{ value: Tab; label: string; icon: typeof UsersIcon }> = [
  { value: 'members', label: 'Members', icon: UsersIcon },
  { value: 'invitations', label: 'Invitations', icon: Mail },
  { value: 'assign', label: 'Assign learning', icon: Building2 },
  { value: 'progress', label: 'Progress', icon: BarChart3 },
  { value: 'audit', label: 'Audit log', icon: ScrollText },
]

function formatDate(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

export function OrganizationDetailPage() {
  const { orgId = '' } = useParams<{ orgId: string }>()
  const [tab, setTab] = useState<Tab>('members')
  const { user: currentUser } = useAuthStore()

  const orgQuery = useQuery({
    queryKey: ['organizations', orgId],
    queryFn: () => organizationsApi.getOne(orgId),
    enabled: Boolean(orgId),
  })

  if (orgQuery.isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.panelLoading} role="status">
          Loading organization…
        </div>
      </div>
    )
  }

  if (orgQuery.isError || !orgQuery.data) {
    return (
      <div className={styles.container}>
        <GlassCard className={styles.errorState}>
          <h1>Organization unavailable</h1>
          <Button type="button" onClick={() => void orgQuery.refetch()}>
            Try again
          </Button>
        </GlassCard>
      </div>
    )
  }

  const org = orgQuery.data
  const currentUserId = currentUser?.id ?? currentUser?._id
  const myMembership = org.members.find((member) => member.user?.id === currentUserId)
  const canManage =
    currentUser?.role === 'admin' || myMembership?.role === 'owner' || myMembership?.role === 'admin'

  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.headerBanner}>
        <div>
          <Badge tone="cyan">
            <Building2 size={13} /> Organization
          </Badge>
          <h1>{org.name}</h1>
          <p>
            {org.members.length} member{org.members.length === 1 ? '' : 's'} · your role:{' '}
            {myMembership?.role ?? (currentUser?.role === 'admin' ? 'platform admin' : 'none')}
          </p>
        </div>
      </GlassCard>

      <nav className={styles.tabs} aria-label="Organization sections">
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

      {tab === 'members' && <MembersTab orgId={orgId} canManage={canManage} />}
      {tab === 'invitations' && <InvitationsTab orgId={orgId} canManage={canManage} />}
      {tab === 'assign' && <AssignLearningTab orgId={orgId} canManage={canManage} />}
      {tab === 'progress' && <ProgressTab orgId={orgId} />}
      {tab === 'audit' && <AuditLogTab orgId={orgId} />}
    </div>
  )
}

function MembersTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const queryClient = useQueryClient()
  const orgQuery = useQuery({
    queryKey: ['organizations', orgId],
    queryFn: () => organizationsApi.getOne(orgId),
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['organizations', orgId] })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrganizationMemberRole }) =>
      organizationsApi.updateMemberRole(orgId, userId, role),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationFn: (userId: string) => organizationsApi.removeMember(orgId, userId),
    onSuccess: invalidate,
  })

  if (!orgQuery.data) return null

  return (
    <GlassCard className={styles.panel}>
      {(roleMutation.isError || removeMutation.isError) && (
        <p role="alert" className={styles.muted} style={{ color: 'var(--nx-danger)', marginBottom: '12px' }}>
          Could not update that member. Please try again.
        </p>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              {canManage && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {orgQuery.data.members.map((member) => (
              <tr key={member.id}>
                <td>{member.user?.name ?? 'Unknown user'}</td>
                <td>{member.user?.email ?? '—'}</td>
                <td>
                  {canManage ? (
                    <select
                      aria-label={`Role for ${member.user?.name ?? 'member'}`}
                      value={member.role}
                      disabled={roleMutation.isPending}
                      onChange={(event) =>
                        member.user &&
                        roleMutation.mutate({
                          userId: member.user.id,
                          role: event.target.value as OrganizationMemberRole,
                        })
                      }
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </select>
                  ) : (
                    <Badge tone="neutral">{member.role}</Badge>
                  )}
                </td>
                <td>{formatDate(member.joinedAt)}</td>
                {canManage && (
                  <td>
                    <button
                      type="button"
                      className={styles.rowAction}
                      disabled={removeMutation.isPending}
                      onClick={() => member.user && removeMutation.mutate(member.user.id)}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}

function InvitationsTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationMemberRole>('member')
  const queryClient = useQueryClient()

  const invitationsQuery = useQuery({
    queryKey: ['organizations', orgId, 'invitations'],
    queryFn: () => organizationsApi.listInvitations(orgId),
  })
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'invitations'] })

  const inviteMutation = useMutation({
    mutationFn: () => organizationsApi.inviteMember(orgId, email, role),
    onSuccess: () => {
      setEmail('')
      invalidate()
    },
  })
  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) => organizationsApi.revokeInvitation(orgId, invitationId),
    onSuccess: invalidate,
  })

  return (
    <GlassCard className={styles.panel}>
      {canManage && (
        <form
          className={styles.inviteForm}
          onSubmit={(event) => {
            event.preventDefault()
            if (email.trim()) inviteMutation.mutate()
          }}
        >
          <input
            type="email"
            placeholder="teammate@example.com"
            aria-label="Invite email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <select
            aria-label="Invitation role"
            value={role}
            onChange={(event) => setRole(event.target.value as OrganizationMemberRole)}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <Button type="submit" magnetic disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
          </Button>
        </form>
      )}

      {(inviteMutation.isError || revokeMutation.isError) && (
        <p role="alert" className={styles.muted} style={{ color: 'var(--nx-danger)', marginBottom: '12px' }}>
          {inviteMutation.error instanceof Error
            ? inviteMutation.error.message
            : revokeMutation.error instanceof Error
              ? revokeMutation.error.message
              : 'Could not complete that action. Please try again.'}
        </p>
      )}

      {invitationsQuery.data && invitationsQuery.data.length === 0 && (
        <p className={styles.muted}>No invitations yet.</p>
      )}

      {invitationsQuery.data && invitationsQuery.data.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Expires</th>
                {canManage && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {invitationsQuery.data.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>{invitation.role}</td>
                  <td>
                    <Badge
                      tone={
                        invitation.status === 'accepted'
                          ? 'success'
                          : invitation.status === 'pending'
                            ? 'cyan'
                            : 'pink'
                      }
                    >
                      {invitation.status}
                    </Badge>
                  </td>
                  <td>{formatDate(invitation.expiresAt)}</td>
                  {canManage && (
                    <td>
                      {invitation.status === 'pending' && (
                        <button
                          type="button"
                          className={styles.rowAction}
                          disabled={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(invitation.id)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}

function AssignLearningTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const [userId, setUserId] = useState('')
  const [courseId, setCourseId] = useState('')
  const queryClient = useQueryClient()

  const orgQuery = useQuery({
    queryKey: ['organizations', orgId],
    queryFn: () => organizationsApi.getOne(orgId),
  })
  const coursesQuery = useQuery({
    queryKey: ['courses', 'published'],
    queryFn: () => coursesApi.getAll('published'),
  })

  const assignMutation = useMutation({
    mutationFn: () => organizationsApi.assignLearning(orgId, userId, courseId),
    onSuccess: () => {
      setUserId('')
      setCourseId('')
      // Without this, the Progress tab kept serving its stale cached list — missing the
      // just-assigned course — until the default staleTime elapsed.
      void queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'progress'] })
    },
  })

  if (!canManage) {
    return (
      <GlassCard className={styles.panel}>
        <p className={styles.muted}>Only an organization owner or admin can assign learning.</p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className={styles.panel}>
      <form
        className={styles.assignForm}
        onSubmit={(event) => {
          event.preventDefault()
          if (userId && courseId) assignMutation.mutate()
        }}
      >
        <select aria-label="Member" value={userId} onChange={(event) => setUserId(event.target.value)}>
          <option value="">Select a member…</option>
          {orgQuery.data?.members
            .filter((member) => member.user)
            .map((member) => (
              <option key={member.user!.id} value={member.user!.id}>
                {member.user!.name}
              </option>
            ))}
        </select>
        <select aria-label="Course" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
          <option value="">Select a published course…</option>
          {coursesQuery.data?.map((course) => {
            const id = course._id ?? course.id ?? ''
            return (
              <option key={id} value={id}>
                {course.name}
              </option>
            )
          })}
        </select>
        <Button type="submit" magnetic disabled={assignMutation.isPending || !userId || !courseId}>
          {assignMutation.isPending ? 'Assigning…' : 'Assign course'}
        </Button>
      </form>
      {assignMutation.isSuccess && (
        <p role="status" className={styles.successNote}>
          Course assigned.
        </p>
      )}
      {assignMutation.isError && (
        <p role="alert" className={styles.errorNote}>
          {assignMutation.error instanceof Error
            ? assignMutation.error.message
            : 'Could not assign the course.'}
        </p>
      )}
    </GlassCard>
  )
}

function ProgressTab({ orgId }: { orgId: string }) {
  const progressQuery = useQuery({
    queryKey: ['organizations', orgId, 'progress'],
    queryFn: () => organizationsApi.getMembersProgress(orgId),
  })

  if (progressQuery.isLoading) {
    return (
      <div className={styles.panelLoading} role="status">
        Loading progress…
      </div>
    )
  }

  if (!progressQuery.data || progressQuery.data.length === 0) {
    return (
      <GlassCard className={styles.panel}>
        <p className={styles.muted}>No enrollment activity yet.</p>
      </GlassCard>
    )
  }

  return (
    <div className={styles.progressGrid}>
      {progressQuery.data.map((member) => (
        <GlassCard key={member.userId} className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <strong>{member.name}</strong>
            <Badge tone="violet">
              {member.certificatesEarned} certificate{member.certificatesEarned === 1 ? '' : 's'}
            </Badge>
          </div>
          {member.courses.length === 0 ? (
            <p className={styles.muted}>Not enrolled in any course yet.</p>
          ) : (
            <ul>
              {member.courses.map((course) => (
                <li key={course.courseId}>
                  <span>{course.courseName}</span>
                  <span>{course.progress?.percent ?? 0}%</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

function AuditLogTab({ orgId }: { orgId: string }) {
  const auditQuery = useQuery({
    queryKey: ['organizations', orgId, 'audit-log'],
    queryFn: () => organizationsApi.getAuditLog(orgId),
  })

  return (
    <GlassCard className={styles.panel}>
      {auditQuery.data && auditQuery.data.length === 0 && (
        <p className={styles.muted}>No audit events yet.</p>
      )}
      {auditQuery.data && auditQuery.data.length > 0 && (
        <ul className={styles.auditList}>
          {auditQuery.data.map((entry) => (
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
    </GlassCard>
  )
}

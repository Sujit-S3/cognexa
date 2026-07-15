import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { coursesApi, type CourseView, type UserAttrs } from '../../services/api'
import { GlassCard, Badge, Button, Reveal, RevealItem } from '../../design'
import styles from './AdminDashboard.module.css'

export function AdminDashboard() {
  const { data: courses = [], isLoading: coursesLoading } = useQuery<CourseView[]>({
    queryKey: ['courses'],
    queryFn: () => coursesApi.getAll(),
  })

  // Simulated system users list for governance demo
  const [users, setUsers] = useState<UserAttrs[]>([
    { _id: 'u-1', username: 'alex_ai', name: 'Alex Rivera', email: 'alex@nexus.ai', role: 'student', isActive: true, photo: 'https://www.w3schools.com/howto/img_avatar.png', lastSeenAt: new Date() },
    { _id: 'u-2', username: 'dr_vance', name: 'Dr. Marcus Vance', email: 'vance@nexus.ai', role: 'instructor', isActive: true, photo: 'https://www.w3schools.com/howto/img_avatar.png', lastSeenAt: new Date() },
    { _id: 'u-3', username: 'sujit_s3', name: 'Sujit S3', email: 'sujit@nexus.ai', role: 'admin', isActive: true, photo: 'https://www.w3schools.com/howto/img_avatar.png', lastSeenAt: new Date() },
    { _id: 'u-4', username: 'elena_r', name: 'Elena Rostova', email: 'elena@nexus.ai', role: 'student', isActive: false, photo: 'https://www.w3schools.com/howto/img_avatar.png', lastSeenAt: new Date() },
  ])

  const handleRoleChange = (userId: string, newRole: 'admin' | 'student' | 'instructor') => {
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
    )
  }

  const handleToggleActive = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, isActive: !u.isActive } : u))
    )
  }

  return (
    <div className={styles.container}>
      {/* Banner */}
      <GlassCard elevation="raised" glow className={styles.banner}>
        <div>
          <Badge tone="brand" style={{ marginBottom: '10px' }}>🛡️ Platform Governance</Badge>
          <h1 className={styles.title}>System Admin Panel</h1>
          <p className={styles.subtitle}>
            Monitor platform health, manage role assignments (RBAC), and oversee curriculum governance across NEXUS AI.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Badge tone="success" style={{ padding: '8px 14px', fontSize: '0.88rem' }}>
            🟢 System Healthy (99.99%)
          </Badge>
          <Badge tone="cyan" style={{ padding: '8px 14px', fontSize: '0.88rem' }}>
            ⚡ API Latency: 12ms
          </Badge>
        </div>
      </GlassCard>

      {/* Telemetry Grid */}
      <Reveal className={styles.statsGrid}>
        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Total Registered Users</span>
              <span>👥</span>
            </div>
            <div className={styles.statValue}>42,810</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--nx-accent-cyan)' }}>↑ +318 this week</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Active Instructors</span>
              <span>👨‍🏫</span>
            </div>
            <div className={styles.statValue}>384</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--nx-success)' }}>↑ Verified faculty</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Platform Courses</span>
              <span>📚</span>
            </div>
            <div className={styles.statValue}>{courses.length || 14}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--nx-accent-cyan)' }}>Across 8 disciplines</div>
          </GlassCard>
        </RevealItem>

        <RevealItem>
          <GlassCard className={styles.statCard}>
            <div className={styles.statHeader}>
              <span>Database Load</span>
              <span>💾</span>
            </div>
            <div className={styles.statValue}>14.2%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--nx-success)' }}>MongoDB Atlas Cluster</div>
          </GlassCard>
        </RevealItem>
      </Reveal>

      {/* User Governance Table */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>🔑 Role & User Governance (RBAC)</span>
          </h2>
          <Badge tone="brand">{users.length} Users Displayed</Badge>
        </div>

        <GlassCard className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User / Email</th>
                <th>Current Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={u.photo || 'https://www.w3schools.com/howto/img_avatar.png'} alt={u.name} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1.5px solid var(--nx-brand-400)' }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{u.name}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--nx-fg-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className={styles.roleSelect}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id!, e.target.value as 'student' | 'instructor' | 'admin')}
                    >
                      <option value="student" style={{ background: '#0f172a' }}>🎓 Student</option>
                      <option value="instructor" style={{ background: '#0f172a' }}>👨‍🏫 Instructor</option>
                      <option value="admin" style={{ background: '#0f172a' }}>🛡️ Admin</option>
                    </select>
                  </td>
                  <td>
                    <Badge tone={u.isActive ? 'success' : 'pink'}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(u._id!)}
                      style={{ color: u.isActive ? 'var(--nx-danger)' : 'var(--nx-success)' }}
                    >
                      {u.isActive ? 'Suspend' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </div>

      {/* Course Audit List */}
      <div>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span>📚 Global Curriculum Audit</span>
          </h2>
        </div>

        <GlassCard className={styles.tableCard}>
          {coursesLoading ? (
            <div style={{ padding: '20px', color: 'var(--nx-fg-muted)' }}>Loading platform courses...</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Status</th>
                  <th>Modules Count</th>
                  <th>Governance</th>
                </tr>
              </thead>
              <tbody>
                {(courses.length > 0 ? courses : [
                  { _id: 'demo-ai', name: 'AI & Robotics — Neural Control Systems', status: 'published' as const, modules: [{}, {}] },
                  { _id: 'demo-web', name: 'Web Mastery — 3D WebGL & React 19', status: 'published' as const, modules: [{}] },
                ]).map((c, i) => (
                  <tr key={c._id || i}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td>
                      <Badge tone={c.status === 'published' ? 'success' : 'neutral'}>
                        {c.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td>{c.modules?.length || 1} Modules</td>
                    <td>
                      <Button variant="secondary" size="sm">
                        Audit Curriculum →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

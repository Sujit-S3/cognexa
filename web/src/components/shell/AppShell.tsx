/**
 * AppShell — Glass Sidebar + Top Nav layout for authenticated users.
 * Rendered around all protected routes via React Router's nested layout pattern.
 */
import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Badge } from '../../design'
import { BrandLogo } from '../brand/BrandLogo'
import styles from './AppShell.module.css'

interface NavItem {
  label: string
  icon: string
  to: string
  roles: Array<'student' | 'instructor' | 'admin'>
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '⚡', to: '/dashboard', roles: ['student'] },
  { label: 'My Courses', icon: '📚', to: '/catalog', roles: ['student', 'instructor'] },
  { label: 'AI Tutor', icon: '🤖', to: '/ai', roles: ['student', 'instructor', 'admin'] },
  { label: 'Assessments', icon: '📝', to: '/assessments/quizzes/mock-2', roles: ['student'] },
  { label: 'Certificates', icon: '🏆', to: '/dashboard', roles: ['student'] },
  { label: 'Portal', icon: '🎯', to: '/instructor', roles: ['instructor'] },
  { label: 'Analytics', icon: '📊', to: '/instructor', roles: ['instructor'] },
  { label: 'Admin Panel', icon: '🛡️', to: '/admin', roles: ['admin'] },
  { label: 'Users', icon: '👥', to: '/admin', roles: ['admin'] },
  { label: 'Settings', icon: '⚙️', to: '/dashboard', roles: ['student', 'instructor', 'admin'] },
]

export function AppShell() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const role = user?.role ?? 'student'
  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(role as never))

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  // Build breadcrumb segments from pathname
  const segments = location.pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg, idx) => ({
    label: seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    to: '/' + segments.slice(0, idx + 1).join('/'),
    isLast: idx === segments.length - 1,
  }))

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          {/* Logo */}
          <Link to="/" className={styles.logo}>
            <BrandLogo compact={collapsed} />
          </Link>

          {/* Nav */}
          <nav className={styles.nav}>
            {visibleNav.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                  {active && !collapsed && <span className={styles.navActiveDot} />}
                </Link>
              )
            })}
          </nav>

          {/* Footer: User chip + logout */}
          <div className={styles.sidebarFooter}>
            {user && (
              <div className={styles.userChip}>
                <img
                  src={
                    user.photo ||
                    `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.name)}`
                  }
                  alt={user.name}
                  className={styles.avatar}
                />
                {!collapsed && (
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.name.split(' ')[0]}</div>
                    <Badge tone="brand" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                      {user.role.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>
            )}
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
              🚪
            </button>
          </div>
        </div>

        {/* Collapse toggle */}
        <button className={styles.collapseBtn} onClick={() => setCollapsed((c) => !c)} title="Toggle sidebar">
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* ── Main Content Area ── */}
      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          {/* Breadcrumbs */}
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link to="/" className={styles.breadcrumbLink}>
              Home
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.to} className={styles.breadcrumbItem}>
                <span className={styles.breadcrumbSep}>/</span>
                {crumb.isLast ? (
                  <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                ) : (
                  <Link to={crumb.to} className={styles.breadcrumbLink}>
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Right actions */}
          <div className={styles.topbarActions}>
            <Link to="/catalog" className={styles.topbarBtn} title="Course Catalog">
              📚
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className={styles.content} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

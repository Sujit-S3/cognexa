import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Button, Badge } from '../../design'
import { NotificationDrawer } from '../notifications/NotificationDrawer'
import { BrandLogo } from '../brand/BrandLogo'
import styles from './Header.module.css'

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to="/" className={styles.logo}>
            <BrandLogo />
          </Link>

          <nav className={styles.nav}>
            <a href="/#about" className={styles.navLink}>
              About
            </a>
            <Link to="/catalog" className={styles.navLink}>
              Course Catalog
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className={styles.navLink}>
                  My Dashboard
                </Link>
                {user?.role === 'instructor' && (
                  <Link to="/instructor" className={styles.navLink}>
                    Instructor Portal
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link to="/admin" className={styles.navLink}>
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className={styles.actions}>
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    color: '#fff',
                    position: 'relative',
                  }}
                  title="View Notifications"
                >
                  🔔
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--nx-brand-400)',
                      boxShadow: '0 0 8px var(--nx-brand-400)',
                    }}
                  />
                </button>
                <Link to="/dashboard" className={styles.userChip}>
                  <img
                    src={user.photo || 'https://www.w3schools.com/howto/img_avatar.png'}
                    alt={user.name}
                    className={styles.avatar}
                  />
                  <span>{user.name.split(' ')[0]}</span>
                  <Badge tone="brand" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                    {user.role.toUpperCase()}
                  </Badge>
                </Link>
                <Button
                  magnetic
                  tone="neutral"
                  onClick={handleLogout}
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth/login">
                  <Button magnetic tone="neutral" style={{ padding: '9px 18px', fontSize: '0.9rem' }}>
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button magnetic glow style={{ padding: '9px 18px', fontSize: '0.9rem' }}>
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </>
  )
}

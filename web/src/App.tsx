/**
 * NEXUS AI — Application Router
 *
 * Layout structure:
 *   / (public)      → Header + landing sections
 *   /auth/*         → full-screen auth pages (no shell)
 *   /dashboard/*    → RequireAuth → AppShell (glass sidebar) → page
 *   /instructor/*   → RequireAuth → AppShell → page
 *   /admin/*        → RequireAuth → AppShell → page
 *   /catalog        → public CourseCatalogPage (no shell, uses Header)
 *   /courses/:id    → public CourseDetailPage  (no shell, uses Header)
 */
import { Routes, Route } from 'react-router-dom'
import { useSmoothScroll } from './design'

// ── Layout components ──
import { Header } from './components/common/Header'
import { AppShell } from './components/shell/AppShell'

// ── Auth guard ──
import { RequireAuth } from './lib/RequireAuth'

// ── Landing sections ──
import { Hero } from './sections/Hero'
import { CourseCatalog } from './sections/CourseCatalog'
import { ProgressDemo } from './sections/ProgressDemo'
import { Features } from './sections/Features'
import { Testimonials } from './sections/Testimonials'
import { EnrollCTA } from './sections/EnrollCTA'

// ── Auth pages ──
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

// ── Dashboard pages ──
import { StudentDashboard } from './pages/dashboard/StudentDashboard'
import { InstructorDashboard } from './pages/dashboard/InstructorDashboard'
import { AdminDashboard } from './pages/dashboard/AdminDashboard'

// ── Course pages ──
import { CourseCatalogPage } from './pages/courses/CourseCatalogPage'
import { CourseDetailPage } from './pages/courses/CourseDetailPage'

// ── Learning pages ──
import { VideoPlayerPage } from './pages/learn/VideoPlayerPage'

// ── Assessment pages ──
import { AssignmentPage } from './pages/assessments/AssignmentPage'
import { QuizPage } from './pages/assessments/QuizPage'

// ── Landing shell with smooth scroll ──
function LandingShell() {
  useSmoothScroll()
  return (
    <main className="nx-shell">
      <Hero />
      <CourseCatalog />
      <ProgressDemo />
      <Features />
      <Testimonials />
      <EnrollCTA />
    </main>
  )
}

// ── Public layout (header + page) ──
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nx-bg)' }}>
      <Header />
      {children}
    </div>
  )
}

export function App() {
  return (
    <Routes>
      {/* ── Public pages ─────────────────────────────── */}
      <Route
        path="/"
        element={
          <PublicLayout>
            <LandingShell />
          </PublicLayout>
        }
      />
      <Route
        path="/catalog"
        element={
          <PublicLayout>
            <CourseCatalogPage />
          </PublicLayout>
        }
      />
      <Route
        path="/courses/:courseId"
        element={
          <PublicLayout>
            <CourseDetailPage />
          </PublicLayout>
        }
      />

      {/* ── Auth pages (no shell) ────────────────────── */}
      <Route path="/auth/login"         element={<LoginPage />} />
      <Route path="/auth/register"      element={<RegisterPage />} />
      <Route path="/auth/forgot"        element={<ForgotPasswordPage />} />
      <Route path="/auth/reset/:token"  element={<ResetPasswordPage />} />

      {/* ── Authenticated app shell routes ───────────── */}
      <Route
        element={
          <RequireAuth allowedRoles={['student', 'instructor', 'admin']}>
            <AppShell />
          </RequireAuth>
        }
      >
        {/* Student */}
        <Route path="/dashboard" element={<StudentDashboard />} />

        {/* Learning */}
        <Route path="/courses/:courseId/learn/:itemId" element={<VideoPlayerPage />} />

        {/* Assessments */}
        <Route path="/assessments/assignments/:assessmentId" element={<AssignmentPage />} />
        <Route path="/assessments/quizzes/:assessmentId"    element={<QuizPage />} />

        {/* Instructor */}
        <Route
          path="/instructor"
          element={
            <RequireAuth allowedRoles={['instructor', 'admin']}>
              <InstructorDashboard />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  )
}

export default App

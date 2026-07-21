import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/common/Header'
import { AppErrorBoundary } from './components/common/AppErrorBoundary'
import { AppShell } from './components/shell/AppShell'
import { RequireAuth } from './lib/RequireAuth'
import { Hero } from './sections/Hero'

const BrandStory = lazy(() =>
  import('./sections/BrandStory').then((module) => ({ default: module.BrandStory }))
)
const CourseCatalog = lazy(() =>
  import('./sections/CourseCatalog').then((module) => ({ default: module.CourseCatalog }))
)
const ProgressDemo = lazy(() =>
  import('./sections/ProgressDemo').then((module) => ({ default: module.ProgressDemo }))
)
const Features = lazy(() => import('./sections/Features').then((module) => ({ default: module.Features })))
const Testimonials = lazy(() =>
  import('./sections/Testimonials').then((module) => ({ default: module.Testimonials }))
)
const EnrollCTA = lazy(() => import('./sections/EnrollCTA').then((module) => ({ default: module.EnrollCTA })))

// Route-level boundaries keep admin, assessment, and AI code out of the
// anonymous landing bundle.
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage }))
)
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage }))
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage }))
)
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage }))
)
const StudentDashboard = lazy(() =>
  import('./pages/dashboard/StudentDashboard').then((module) => ({ default: module.StudentDashboard }))
)
const InstructorDashboard = lazy(() =>
  import('./pages/dashboard/InstructorDashboard').then((module) => ({ default: module.InstructorDashboard }))
)
const InstructorWorkspacePage = lazy(() =>
  import('./pages/instructor/InstructorWorkspacePage').then((module) => ({
    default: module.InstructorWorkspacePage,
  }))
)
const AdminDashboard = lazy(() =>
  import('./pages/dashboard/AdminDashboard').then((module) => ({ default: module.AdminDashboard }))
)
const CourseCatalogPage = lazy(() =>
  import('./pages/courses/CourseCatalogPage').then((module) => ({ default: module.CourseCatalogPage }))
)
const CourseDetailPage = lazy(() =>
  import('./pages/courses/CourseDetailPage').then((module) => ({ default: module.CourseDetailPage }))
)
const VideoPlayerPage = lazy(() =>
  import('./pages/learn/VideoPlayerPage').then((module) => ({ default: module.VideoPlayerPage }))
)
const AssignmentPage = lazy(() =>
  import('./pages/assessments/AssignmentPage').then((module) => ({ default: module.AssignmentPage }))
)
const QuizPage = lazy(() =>
  import('./pages/assessments/QuizPage').then((module) => ({ default: module.QuizPage }))
)
const AITutorPage = lazy(() =>
  import('./pages/ai/AITutorPage').then((module) => ({ default: module.AITutorPage }))
)

function LandingShell() {
  return (
    <main className="nx-shell">
      <Hero />
      <LandingSection>
        <BrandStory />
      </LandingSection>
      <LandingSection>
        <CourseCatalog />
      </LandingSection>
      <LandingSection>
        <ProgressDemo />
      </LandingSection>
      <LandingSection>
        <Features />
      </LandingSection>
      <LandingSection>
        <Testimonials />
      </LandingSection>
      <LandingSection>
        <EnrollCTA />
      </LandingSection>
    </main>
  )
}

function LandingSection({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<section className="nx-section-skeleton" aria-hidden="true" />}>{children}</Suspense>
  )
}

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nx-bg)' }}>
      <Header />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}

function PageLoading() {
  return (
    <div className="nx-page-loading" role="status" aria-live="polite">
      <span className="nx-page-loading__mark" aria-hidden="true">
        C
      </span>
      <span>Loading your learning space…</span>
    </div>
  )
}

function NotFoundPage() {
  return (
    <main id="main-content" className="nx-not-found">
      <span className="nx-not-found__code">404</span>
      <h1>This path is outside the curriculum.</h1>
      <p>The page may have moved, or you may not have access to it.</p>
      <Link to="/">Return to Cognexa</Link>
    </main>
  )
}

function DocumentTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const page =
      pathname === '/'
        ? null
        : pathname === '/catalog'
          ? 'Course Catalog'
          : pathname.startsWith('/courses/') && pathname.includes('/learn/')
            ? 'Learning Workspace'
            : pathname.startsWith('/courses/')
              ? 'Course Details'
              : pathname === '/dashboard'
                ? 'Dashboard'
                : pathname.startsWith('/instructor/courses/')
                  ? 'Course Builder'
                  : pathname === '/instructor'
                    ? 'Instructor Workspace'
                    : pathname === '/admin'
                      ? 'Admin Control Center'
                      : pathname === '/ai'
                        ? 'AI Tutor'
                        : pathname === '/auth/login'
                          ? 'Sign In'
                          : pathname === '/auth/register'
                            ? 'Create Account'
                            : pathname.startsWith('/auth/')
                              ? 'Account Access'
                              : pathname.startsWith('/assessments/')
                                ? 'Assessment'
                                : 'Page Not Found'

    document.title = page ? `${page} | Cognexa` : 'Cognexa — Connecting Knowledge, Empowering Minds.'
  }, [pathname])

  return null
}

function AppRoutes() {
  return (
    <>
      <DocumentTitle />
      <Routes>
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

        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset/:token" element={<ResetPasswordPage />} />

        <Route
          element={
            <RequireAuth allowedRoles={['student', 'instructor', 'admin']}>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/courses/:courseId/learn/:itemId" element={<VideoPlayerPage />} />
          <Route path="/assessments/assignments/:assessmentId" element={<AssignmentPage />} />
          <Route path="/assessments/quizzes/:assessmentId" element={<QuizPage />} />
          <Route
            path="/instructor"
            element={
              <RequireAuth allowedRoles={['instructor', 'admin']}>
                <InstructorDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/instructor/courses/:courseId/edit"
            element={
              <RequireAuth allowedRoles={['instructor', 'admin']}>
                <InstructorWorkspacePage />
              </RequireAuth>
            }
          />
          <Route path="/ai" element={<AITutorPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <AdminDashboard />
              </RequireAuth>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}

export function App() {
  return (
    <AppErrorBoundary>
      <a className="nx-skip-link" href="#main-content">
        Skip to main content
      </a>
      <Suspense fallback={<PageLoading />}>
        <AppRoutes />
      </Suspense>
    </AppErrorBoundary>
  )
}

export default App

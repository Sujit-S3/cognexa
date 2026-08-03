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
const CourseCatalogPage = lazy(() =>
  import('./pages/courses/CourseCatalogPage').then((module) => ({ default: module.CourseCatalogPage }))
)
const CourseDetailPage = lazy(() =>
  import('./pages/courses/CourseDetailPage').then((module) => ({ default: module.CourseDetailPage }))
)
const CourseLearnPage = lazy(() =>
  import('./pages/learn/CourseLearnPage').then((module) => ({ default: module.CourseLearnPage }))
)
const QuizTakingPage = lazy(() =>
  import('./pages/assessments/QuizTakingPage').then((module) => ({ default: module.QuizTakingPage }))
)
const AssignmentSubmissionPage = lazy(() =>
  import('./pages/assessments/AssignmentSubmissionPage').then((module) => ({
    default: module.AssignmentSubmissionPage,
  }))
)
const SubmissionGradingPage = lazy(() =>
  import('./pages/instructor/SubmissionGradingPage').then((module) => ({
    default: module.SubmissionGradingPage,
  }))
)
const VerifyCertificatePage = lazy(() =>
  import('./pages/certificates/VerifyCertificatePage').then((module) => ({
    default: module.VerifyCertificatePage,
  }))
)
const AITutorPage = lazy(() =>
  import('./pages/ai/AITutorPage').then((module) => ({ default: module.AITutorPage }))
)
const AdminConsolePage = lazy(() =>
  import('./pages/admin/AdminConsolePage').then((module) => ({ default: module.AdminConsolePage }))
)
const OrganizationsListPage = lazy(() =>
  import('./pages/organizations/OrganizationsListPage').then((module) => ({
    default: module.OrganizationsListPage,
  }))
)
const OrganizationDetailPage = lazy(() =>
  import('./pages/organizations/OrganizationDetailPage').then((module) => ({
    default: module.OrganizationDetailPage,
  }))
)
const InvitationAcceptPage = lazy(() =>
  import('./pages/organizations/InvitationAcceptPage').then((module) => ({
    default: module.InvitationAcceptPage,
  }))
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
                : pathname.includes('/submissions')
                  ? 'Submission Grading'
                  : pathname.startsWith('/instructor/courses/')
                    ? 'Course Builder'
                    : pathname === '/instructor'
                      ? 'Instructor Workspace'
                      : pathname === '/admin'
                        ? 'Admin Control Center'
                        : pathname === '/organizations'
                          ? 'Organizations'
                          : pathname.startsWith('/organizations/')
                            ? 'Organization Workspace'
                            : pathname.startsWith('/invitations/')
                              ? 'Accept Invitation'
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
                                        : pathname.startsWith('/certificates/')
                                          ? 'Certificate'
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
        <Route path="/certificates/verify/:code" element={<VerifyCertificatePage />} />
        <Route path="/invitations/:token" element={<InvitationAcceptPage />} />

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
          <Route path="/courses/:courseId/learn/:itemId" element={<CourseLearnPage />} />
          <Route
            path="/assessments/assignments/:courseId/:assessmentId"
            element={<AssignmentSubmissionPage />}
          />
          <Route path="/assessments/quizzes/:courseId/:assessmentId" element={<QuizTakingPage />} />
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
          <Route
            path="/instructor/courses/:courseId/submissions"
            element={
              <RequireAuth allowedRoles={['instructor', 'admin']}>
                <SubmissionGradingPage />
              </RequireAuth>
            }
          />
          <Route path="/ai" element={<AITutorPage />} />
          <Route path="/organizations" element={<OrganizationsListPage />} />
          <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={['admin']}>
                <AdminConsolePage />
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

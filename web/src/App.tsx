import { Routes, Route } from 'react-router-dom'
import { useSmoothScroll } from './design'
import { Header } from './components/common/Header'
import { Hero } from './sections/Hero'
import { CourseCatalog } from './sections/CourseCatalog'
import { ProgressDemo } from './sections/ProgressDemo'
import { Features } from './sections/Features'
import { Testimonials } from './sections/Testimonials'
import { EnrollCTA } from './sections/EnrollCTA'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { RequireAuth } from './components/auth/RequireAuth'
import { StudentDashboard } from './pages/dashboard/StudentDashboard'
import { InstructorDashboard } from './pages/dashboard/InstructorDashboard'
import { AdminDashboard } from './pages/dashboard/AdminDashboard'
import { CourseCatalogPage } from './pages/courses/CourseCatalogPage'
import { CourseDetailPage } from './pages/courses/CourseDetailPage'

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

export function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--nx-bg)' }}>
      <Header />
      <Routes>
        <Route path="/" element={<LandingShell />} />
        <Route path="/catalog" element={<CourseCatalogPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset/:token" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth allowedRoles={['student', 'instructor', 'admin']}>
              <StudentDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/instructor"
          element={
            <RequireAuth allowedRoles={['instructor', 'admin']}>
              <InstructorDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth allowedRoles={['admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  )
}

export default App

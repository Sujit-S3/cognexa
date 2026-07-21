/**
 * Cognexa — Typed API Layer
 * Single Axios instance with JWT injection, 401 handling, and typed response helpers.
 * All feature APIs are co-located here and exported for use with TanStack Query hooks.
 */
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserAttrs {
  _id?: string
  id?: string
  username: string
  name: string
  email: string
  photo: string
  isActive: boolean
  lastSeenAt: Date
  code?: number
  mobile?: string
  role: 'admin' | 'student' | 'instructor'
  enrollments?: string[]
  isEmailRegistered?: boolean
}

export interface AuthResponse {
  user: UserAttrs
  token: string
}

export interface DeviceSession {
  id: string
  userAgent?: string
  lastSeenAt: string
  expiresAt: string
  current: boolean
}

export interface ApiErrorPayload {
  message?: string
  error?: string
  details?: { issues?: string[] }
}

export class ApiClientError extends Error {
  details?: { issues?: string[] }

  constructor(message: string, details?: { issues?: string[] }) {
    super(message)
    this.name = 'ApiClientError'
    this.details = details
  }
}

export type CourseStatus = 'draft' | 'review' | 'published' | 'archived'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all-levels'
export type LessonType =
  'video' | 'pdf' | 'markdown' | 'rich_text' | 'external_url' | 'youtube' | 'live_session' | 'file'

export interface UploadedAssetView {
  url: string
  publicId?: string
  resourceType?: 'image' | 'video' | 'raw'
  format?: string
  bytes?: number
  originalName?: string
  thumbnailUrl?: string
}

export interface CourseLessonView {
  _id?: string
  id?: string
  title: string
  type: LessonType
  order?: number
  description?: string
  url?: string
  content?: string
  durationMinutes?: number
  isPreview?: boolean
  asset?: UploadedAssetView
}

export interface CourseModuleView {
  _id?: string
  id?: string
  title: string
  description?: string
  order?: number
  moduleItems: CourseLessonView[]
}

export type BuilderQuestionType = 'mcq' | 'multiple_select' | 'true_false' | 'fill_blank'

export interface BuilderQuestionView {
  _id?: string
  id?: string
  prompt: string
  type: BuilderQuestionType
  options: string[]
  correctAnswers: string[]
  explanation?: string
  points: number
  pool?: string
}

export interface RubricCriterionView {
  _id?: string
  id?: string
  title: string
  description?: string
  points: number
}

export interface CourseAssessmentView {
  _id?: string
  id?: string
  kind: 'quiz' | 'assignment'
  title: string
  instructions?: string
  order: number
  visibility: 'draft' | 'published'
  questions: BuilderQuestionView[]
  randomizeQuestions: boolean
  randomizeAnswers: boolean
  passingScore: number
  timeLimitMinutes?: number
  questionPoolSize?: number
  dueDate?: string
  attachments: UploadedAssetView[]
  rubric: RubricCriterionView[]
  submissionLimit: number
}

export interface CourseWorkspace {
  id?: string
  _id?: string
  name: string
  subtitle?: string
  description?: string
  image?: string
  thumbnail?: UploadedAssetView
  banner?: UploadedAssetView
  backgroundColor?: string
  category?: string
  tags: string[]
  language: string
  level: CourseLevel
  durationMinutes?: number
  prerequisites: string[]
  pricing: { model: 'free' | 'paid'; amount: number; currency: string }
  seo: { title?: string; description?: string; slug?: string }
  modules: CourseModuleView[]
  assessments: CourseAssessmentView[]
  status: CourseStatus
  reviewNotes?: string
  reviewSubmittedAt?: string
  publishedAt?: string
  draftVersion: number
  createdAt?: string
  updatedAt?: string
}

export interface CourseView extends Partial<CourseWorkspace> {
  name: string
  status: CourseStatus
  enrolled: boolean
  privilege?: 'student' | 'instructor' | 'admin'
  createdBy?: { _id: string; name: string; username: string; photo?: string }
  analytics?: {
    studentCount: number
    lessonCount: number
    assessmentCount: number
    completionCount: number
    completionRate: number
  }
}

export interface InstructorDashboardView {
  summary: {
    courseCount: number
    publishedCourseCount: number
    totalStudents: number
    pendingSubmissions: number
    completionRate: number
    revenue: number | null
    revenueCurrency: string
    revenueStatus: 'not_configured'
  }
  courses: CourseView[]
  students: Array<{
    id: string
    name: string
    email: string
    photo?: string
    lastSeenAt?: string
    enrolledAt: string
    course: { id: string; name: string }
    completed: boolean
  }>
  recentActivity: Array<{
    id: string
    kind: 'submission'
    studentName: string
    assessmentTitle: string
    assessmentType?: string
    occurredAt?: string
    courseId: string
  }>
  topCourses: Array<{
    id: string
    name: string
    status: CourseStatus
    studentCount: number
    lessonCount: number
    assessmentCount: number
    completionCount: number
    completionRate: number
  }>
}

export interface CloudinaryUploadSignature {
  uploadUrl: string
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  resourceType: 'image' | 'video' | 'raw'
}

export interface DeadlineView {
  title: string
  deadline: string
  type: 'Exam' | 'Assignment'
  assessmentId: string
  course: { name: string; id: string }
}

export interface EnrollmentView {
  course: CourseView
  progress: number
  completedItems: string[]
  lastAccessedAt?: string
}

export interface LectureView {
  _id: string
  title: string
  type: LessonType
  url: string
  duration?: number
  moduleId: string
  courseId: string
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Access tokens live only in memory. The durable credential is an HttpOnly,
// rotating refresh cookie, so injected scripts cannot read it.
let accessToken: string | null = null
let refreshRequest: Promise<AuthResponse> | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

function refreshAccessToken(): Promise<AuthResponse> {
  if (!refreshRequest) {
    refreshRequest = axios
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, undefined, { withCredentials: true })
      .then((response) => {
        setAccessToken(response.data.token)
        return response.data
      })
      .finally(() => {
        refreshRequest = null
      })
  }
  return refreshRequest
}

// Request: attach the short-lived in-memory access token.
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean }

// Response: rotate the refresh session once, replay the original request, then
// evict the UI session only when the server can no longer refresh it.
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const original = error.config as RetryableRequest | undefined
    const url = original?.url ?? ''
    const isSessionEndpoint = ['/auth/login', '/auth/register', '/auth/refresh'].some((path) =>
      url.includes(path)
    )

    if (error.response?.status === 401 && original && !original._retry && !isSessionEndpoint) {
      original._retry = true
      try {
        await refreshAccessToken()
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        setAccessToken(null)
        window.dispatchEvent(new Event('cognexa:unauthorized'))
      }
    } else if (error.response?.status === 401) {
      setAccessToken(null)
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new ApiClientError(message, error.response?.data?.details))
  }
)

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  sessionStatus: async () => {
    const res = await api.get<{ hasSession: boolean }>('/auth/session')
    return res.data
  },
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post<AuthResponse>('/auth/login', credentials)
    return res.data
  },
  register: async (payload: {
    username: string
    name: string
    email: string
    password: string
    passwordConfirm: string
    mobile: string
    role?: 'student' | 'instructor'
  }) => {
    const res = await api.post<AuthResponse>('/auth/register', payload)
    return res.data
  },
  refresh: refreshAccessToken,
  logout: async () => {
    const res = await api.post<{ message: string }>('/auth/logout')
    return res.data
  },
  getMe: async () => {
    const res = await api.get<UserAttrs>('/auth/me')
    return res.data
  },
  updateMe: async (payload: Partial<UserAttrs>) => {
    const res = await api.patch<AuthResponse>('/auth/me', payload)
    return res.data
  },
  recoverPassword: async (email: string) => {
    const res = await api.post<{ message: string }>('/auth/recover', { email })
    return res.data
  },
  verifyResetToken: async (token: string) => {
    const res = await api.get<{ valid: boolean }>(`/auth/reset/${token}`)
    return res.data
  },
  resetPassword: async (token: string, payload: { password: string; passwordConfirm: string }) => {
    const res = await api.post<{ message: string }>(`/auth/reset/${token}`, payload)
    return res.data
  },
  getSessions: async () => {
    const res = await api.get<DeviceSession[]>('/auth/sessions')
    return res.data
  },
  revokeSession: async (sessionId: string) => {
    await api.delete(`/auth/sessions/${sessionId}`)
  },
  logoutAll: async () => {
    const res = await api.post<{ message: string }>('/auth/logout-all')
    return res.data
  },
}

// ─── Courses API ─────────────────────────────────────────────────────────────

export const coursesApi = {
  getAll: async (filter?: CourseStatus) => {
    const res = await api.get<CourseView[]>('/courses', { params: filter ? { filter } : {} })
    return res.data
  },
  getOne: async (courseId: string) => {
    const res = await api.get<CourseView>(`/courses/${courseId}`)
    return res.data
  },
  create: async (payload: { courseName: string; description?: string; image?: string }) => {
    const res = await api.post<CourseView[]>('/courses', payload)
    return res.data
  },
  update: async (courseId: string, payload: Partial<CourseView>) => {
    const res = await api.put<CourseView>(`/courses/${courseId}`, payload)
    return res.data
  },
  delete: async (courseId: string) => {
    const res = await api.delete<{ message: string }>(`/courses/${courseId}`)
    return res.data
  },
  enroll: async (courseId: string) => {
    const res = await api.post<CourseView>(`/courses/${courseId}/enroll`)
    return res.data
  },
  unEnroll: async (courseId: string) => {
    const res = await api.post<CourseView>(`/courses/${courseId}/un-enroll`)
    return res.data
  },
}

// Instructor workspace uses dedicated ownership-checked endpoints. Drafts are
// persisted in MongoDB; browser state is only an optimistic editing buffer.
export const instructorApi = {
  getDashboard: async () => {
    const res = await api.get<InstructorDashboardView>('/instructor/dashboard')
    return res.data
  },
  createDraft: async (name = 'Untitled course') => {
    const res = await api.post<CourseWorkspace>('/instructor/courses', { name })
    return res.data
  },
  getWorkspace: async (courseId: string) => {
    const res = await api.get<CourseWorkspace>(`/instructor/courses/${courseId}`)
    return res.data
  },
  saveWorkspace: async (courseId: string, workspace: CourseWorkspace) => {
    const payload = {
      draftVersion: workspace.draftVersion,
      name: workspace.name,
      subtitle: workspace.subtitle,
      description: workspace.description,
      image: workspace.image,
      thumbnail: workspace.thumbnail,
      banner: workspace.banner,
      category: workspace.category,
      tags: workspace.tags,
      language: workspace.language,
      level: workspace.level,
      durationMinutes: workspace.durationMinutes,
      prerequisites: workspace.prerequisites,
      pricing: workspace.pricing,
      seo: workspace.seo,
      modules: workspace.modules,
      assessments: workspace.assessments,
    }
    const res = await api.put<CourseWorkspace>(`/instructor/courses/${courseId}`, payload)
    return res.data
  },
  transitionStatus: async (courseId: string, status: CourseStatus, reviewNotes?: string) => {
    const res = await api.post<CourseWorkspace>(`/instructor/courses/${courseId}/status`, {
      status,
      reviewNotes,
    })
    return res.data
  },
  createUploadSignature: async (payload: {
    courseId: string
    purpose: 'thumbnail' | 'banner' | 'lesson-video' | 'lesson-file' | 'assignment-file'
    resourceType: 'image' | 'video' | 'raw'
    originalName: string
  }) => {
    const res = await api.post<CloudinaryUploadSignature>('/uploads/cloudinary/signature', payload)
    return res.data
  },
}

// ─── Deadlines / Assessments ─────────────────────────────────────────────────

export const deadlinesApi = {
  getDeadlines: async () => {
    const res = await api.get<DeadlineView[]>('/deadlines')
    return res.data
  },
}

// ─── Lectures ────────────────────────────────────────────────────────────────

export const lecturesApi = {
  getOne: async (lectureId: string) => {
    const res = await api.get<LectureView>(`/lectures/${lectureId}`)
    return res.data
  },
  markComplete: async (lectureId: string) => {
    const res = await api.post<{ message: string }>(`/lectures/${lectureId}/complete`)
    return res.data
  },
}

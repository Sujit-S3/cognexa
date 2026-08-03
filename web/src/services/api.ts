/**
 * Cognexa — Typed API Layer
 * Single Axios instance with JWT injection, 401 handling, and typed response helpers.
 * All feature APIs are co-located here and exported for use with TanStack Query hooks.
 */
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'student' | 'instructor'

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
  role: UserRole
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

export interface CourseProgressView {
  completedCount: number
  totalCount: number
  percent: number
  completedItems: string[]
  lastAccessedItemId?: string
  lastAccessedAt?: string
}

// The API hides quiz questions from anyone who isn't an owning instructor — a non-manager
// (student, or an anonymous viewer) gets questionCount instead of the real questions array. Both
// are optional here since CourseView is shared by both viewer shapes.
export interface CourseAssessmentSummaryView {
  _id?: string
  id?: string
  kind: 'quiz' | 'assignment'
  title: string
  instructions?: string
  order: number
  visibility: 'draft' | 'published'
  randomizeQuestions: boolean
  randomizeAnswers: boolean
  passingScore: number
  timeLimitMinutes?: number
  questionPoolSize?: number
  dueDate?: string
  attachments: UploadedAssetView[]
  rubric: RubricCriterionView[]
  submissionLimit: number
  questionCount?: number
  questions?: BuilderQuestionView[]
}

export interface CourseView extends Partial<Omit<CourseWorkspace, 'assessments'>> {
  name: string
  status: CourseStatus
  enrolled: boolean
  privilege?: 'student' | 'instructor' | 'admin'
  createdBy?: { _id: string; name: string; username: string; photo?: string }
  progress?: CourseProgressView | null
  assessments?: CourseAssessmentSummaryView[]
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
  kind: 'quiz' | 'assignment'
  assessmentId: string
  course: { name: string; id: string }
}

export interface ModuleItemDetailView {
  _id: string
  title: string
  type: LessonType
  order?: number
  description?: string
  url?: string
  content?: string
  durationMinutes?: number
  isPreview?: boolean
  asset?: UploadedAssetView
  completed: boolean
  videoId?: string
}

// ─── Assessment delivery (learner-facing) ────────────────────────────────────

export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded'

// Deliberately excludes correctAnswers/explanation — never trust a learner-facing question type
// to omit the answer key by convention alone; this is a distinct shape from BuilderQuestionView.
export interface QuizAttemptQuestionView {
  questionId: string
  prompt: string
  type: BuilderQuestionType
  options: string[]
  points: number
}

export interface SubmissionAnswerView {
  questionId: string
  response: string[]
}

export interface RubricScoreView {
  criterionId: string
  points: number
}

export interface QuestionResultView {
  questionId: string
  correct: boolean
  pointsAwarded: number
  pointsPossible: number
}

// Only ever present once a quiz submission is graded — the server omits it otherwise.
export interface AnswerKeyEntryView {
  questionId: string
  correctAnswers: string[]
  explanation?: string
}

export interface SubmissionView {
  id: string
  course: string
  courseAssessmentId: string
  kind: 'quiz' | 'assignment'
  student: string
  status: SubmissionStatus
  attemptNumber: number
  presentedQuestions?: QuizAttemptQuestionView[]
  answers?: SubmissionAnswerView[]
  timeLimitExpiresAt?: string
  text?: string
  attachments?: UploadedAssetView[]
  rubricScores?: RubricScoreView[]
  score?: number
  maxScore?: number
  passed?: boolean
  feedback?: string
  gradedBy?: string
  gradedAt?: string
  questionResults?: QuestionResultView[]
  answerKey?: AnswerKeyEntryView[]
  startedAt: string
  submittedAt?: string
  assessmentTitleSnapshot: string
}

export interface AssessmentLearnerView {
  id: string
  kind: 'quiz' | 'assignment'
  title: string
  instructions?: string
  order: number
  visibility: 'draft' | 'published'
  randomizeQuestions: boolean
  randomizeAnswers: boolean
  passingScore: number
  timeLimitMinutes?: number
  questionPoolSize?: number
  dueDate?: string
  attachments: UploadedAssetView[]
  rubric: RubricCriterionView[]
  submissionLimit: number
  questionCount: number
}

// ─── Certificates ─────────────────────────────────────────────────────────

export interface AchievementView {
  id: string
  user: string
  course: { _id?: string; id?: string; name: string } | string
  score: string
  gradeLetter: string
  finishedAt: string
  certificate?: string
}

export interface CertificateVerificationView {
  valid: boolean
  learnerName?: string
  courseName?: string
  gradeLetter?: string
  score?: string
  finishedAt?: string
}

// ─── Notifications ────────────────────────────────────────────────────────

export interface NotificationView {
  id: string
  type: 'quiz_graded' | 'assignment_graded' | 'certificate_issued'
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

export interface AssessmentForLearnerResponse {
  assessment: AssessmentLearnerView
  submission: SubmissionView | null
  attemptsUsed: number
  attemptsAllowed: number
}

interface SubmissionDraftPayload {
  answers?: SubmissionAnswerView[]
  text?: string
  attachments?: UploadedAssetView[]
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
    purpose:
      'thumbnail' | 'banner' | 'lesson-video' | 'lesson-file' | 'assignment-file' | 'assignment-submission'
    resourceType: 'image' | 'video' | 'raw'
    originalName: string
  }) => {
    const res = await api.post<CloudinaryUploadSignature>('/uploads/cloudinary/signature', payload)
    return res.data
  },
  getSubmissionsQueue: async (courseId: string) => {
    const res = await api.get<SubmissionView[]>(`/instructor/courses/${courseId}/submissions`)
    return res.data
  },
  gradeSubmission: async (
    courseId: string,
    submissionId: string,
    payload: { score?: number; rubricScores?: RubricScoreView[]; feedback?: string }
  ) => {
    const res = await api.post<SubmissionView>(
      `/instructor/courses/${courseId}/submissions/${submissionId}/grade`,
      payload
    )
    return res.data
  },
}

// ─── Certificates ─────────────────────────────────────────────────────────

export const certificatesApi = {
  getMine: async () => {
    const res = await api.get<AchievementView[]>('/certificates/mine')
    return res.data
  },
  downloadUrl: (achievementId: string) => `${API_BASE_URL}/certificates/${achievementId}/pdf`,
  verify: async (code: string) => {
    const res = await api.get<CertificateVerificationView>(`/certificates/verify/${encodeURIComponent(code)}`)
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

// ─── Lectures (module-item playback and progress) ────────────────────────────

export const lecturesApi = {
  getOne: async (courseId: string, itemId: string) => {
    const res = await api.get<ModuleItemDetailView>(`/courses/${courseId}/lectures/${itemId}`)
    return res.data
  },
  markComplete: async (courseId: string, itemId: string) => {
    const res = await api.post<CourseProgressView>(`/courses/${courseId}/lectures/${itemId}/complete`)
    return res.data
  },
}

// ─── Assessments (learner-facing quiz/assignment delivery) ──────────────────

export const assessmentsApi = {
  getForLearner: async (courseId: string, assessmentId: string) => {
    const res = await api.get<AssessmentForLearnerResponse>(`/assessments/${courseId}/${assessmentId}`)
    return res.data
  },
  startAttempt: async (courseId: string, assessmentId: string) => {
    const res = await api.post<SubmissionView>(`/assessments/${courseId}/${assessmentId}/attempts`)
    return res.data
  },
  updateSubmission: async (submissionId: string, payload: SubmissionDraftPayload) => {
    const res = await api.patch<SubmissionView>(`/assessments/submissions/${submissionId}`, payload)
    return res.data
  },
  submitSubmission: async (submissionId: string, payload: SubmissionDraftPayload = {}) => {
    const res = await api.post<SubmissionView>(`/assessments/submissions/${submissionId}/submit`, payload)
    return res.data
  },
  getSubmission: async (submissionId: string) => {
    const res = await api.get<SubmissionView>(`/assessments/submissions/${submissionId}`)
    return res.data
  },
}

// ─── Notifications ────────────────────────────────────────────────────────

export const notificationsApi = {
  getAll: async () => {
    const res = await api.get<NotificationView[]>('/notifications')
    return res.data
  },
  getUnreadCount: async () => {
    const res = await api.get<{ count: number }>('/notifications/unread-count')
    return res.data.count
  },
  markAsRead: async (notificationId: string) => {
    const res = await api.post<NotificationView>(`/notifications/${notificationId}/read`)
    return res.data
  },
  markAllAsRead: async () => {
    await api.post('/notifications/read-all')
  },
}

// ─── Admin console ───────────────────────────────────────────────────────────

export interface AdminUserView {
  id: string
  username: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  lastSeenAt: string
}

export interface AuditLogEntryView {
  id: string
  actor: { id: string; name: string; email: string }
  action: string
  targetType: string
  targetId: string
  metadata?: Record<string, unknown>
  organization?: string
  createdAt: string
}

export interface PagedResult {
  total: number
  page: number
  limit: number
}

export const adminApi = {
  listUsers: async (params: { search?: string; role?: UserRole; page?: number; limit?: number } = {}) => {
    const res = await api.get<{ users: AdminUserView[] } & PagedResult>('/admin/users', { params })
    return res.data
  },
  updateUserStatus: async (userId: string, isActive: boolean) => {
    const res = await api.post<AdminUserView>(`/admin/users/${userId}/status`, { isActive })
    return res.data
  },
  updateUserRole: async (userId: string, role: UserRole) => {
    const res = await api.post<AdminUserView>(`/admin/users/${userId}/role`, { role })
    return res.data
  },
  getAuditLog: async (params: { organization?: string; page?: number; limit?: number } = {}) => {
    const res = await api.get<{ entries: AuditLogEntryView[] } & PagedResult>('/admin/audit-log', { params })
    return res.data
  },
}

// ─── Organization tenancy ─────────────────────────────────────────────────────

export type OrganizationMemberRole = 'owner' | 'admin' | 'member'
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface OrganizationMemberView {
  id: string
  role: OrganizationMemberRole
  joinedAt: string
  user: { id: string; name: string; email: string; photo: string } | null
}

export interface OrganizationView {
  id: string
  name: string
  slug: string
  createdBy: string
  members: OrganizationMemberView[]
  createdAt: string
  updatedAt: string
}

export interface InvitationView {
  id: string
  organization: string
  email: string
  role: OrganizationMemberRole
  status: InvitationStatus
  invitedBy: string
  expiresAt: string
  createdAt: string
}

export interface InvitationPreviewView {
  id: string
  organization: { id: string; name: string }
  email: string
  role: OrganizationMemberRole
  status: InvitationStatus
}

export interface MemberProgressView {
  userId: string
  name: string
  email: string
  certificatesEarned: number
  courses: Array<{ courseId: string; courseName: string; progress: CourseProgressView | null }>
}

export const organizationsApi = {
  create: async (name: string) => {
    const res = await api.post<OrganizationView>('/organizations', { name })
    return res.data
  },
  listMine: async () => {
    const res = await api.get<OrganizationView[]>('/organizations/mine')
    return res.data
  },
  getOne: async (orgId: string) => {
    const res = await api.get<OrganizationView>(`/organizations/${orgId}`)
    return res.data
  },
  inviteMember: async (orgId: string, email: string, role: OrganizationMemberRole = 'member') => {
    const res = await api.post<InvitationView>(`/organizations/${orgId}/invitations`, { email, role })
    return res.data
  },
  listInvitations: async (orgId: string) => {
    const res = await api.get<InvitationView[]>(`/organizations/${orgId}/invitations`)
    return res.data
  },
  revokeInvitation: async (orgId: string, invitationId: string) => {
    const res = await api.post<InvitationView>(`/organizations/${orgId}/invitations/${invitationId}/revoke`)
    return res.data
  },
  updateMemberRole: async (orgId: string, userId: string, role: OrganizationMemberRole) => {
    const res = await api.patch<OrganizationView>(`/organizations/${orgId}/members/${userId}`, { role })
    return res.data
  },
  removeMember: async (orgId: string, userId: string) => {
    await api.delete(`/organizations/${orgId}/members/${userId}`)
  },
  assignLearning: async (orgId: string, userId: string, courseId: string) => {
    const res = await api.post<{ userId: string; courseId: string }>(
      `/organizations/${orgId}/assign-learning`,
      { userId, courseId }
    )
    return res.data
  },
  getMembersProgress: async (orgId: string) => {
    const res = await api.get<MemberProgressView[]>(`/organizations/${orgId}/progress`)
    return res.data
  },
  getAuditLog: async (orgId: string) => {
    const res = await api.get<AuditLogEntryView[]>(`/organizations/${orgId}/audit-log`)
    return res.data
  },
}

export const invitationsApi = {
  getByToken: async (token: string) => {
    const res = await api.get<InvitationPreviewView>(`/invitations/${encodeURIComponent(token)}`)
    return res.data
  },
  accept: async (token: string) => {
    const res = await api.post<OrganizationView>(`/invitations/${encodeURIComponent(token)}/accept`)
    return res.data
  },
}

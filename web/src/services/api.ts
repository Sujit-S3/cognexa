/**
 * NEXUS AI — Typed API Layer
 * Single Axios instance with JWT injection, 401 handling, and typed response helpers.
 * All feature APIs are co-located here and exported for use with TanStack Query hooks.
 */
import axios, { AxiosError, type AxiosResponse } from 'axios'

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

export interface ApiErrorPayload {
  message?: string
  error?: string
}

export interface CourseView {
  id?: string
  _id?: string
  name: string
  description?: string
  image?: string
  backgroundColor?: string
  status: 'published' | 'archived'
  enrolled: boolean
  privilege?: 'student' | 'instructor' | 'admin'
  createdBy?: { _id: string; name: string; username: string; photo?: string }
  modules?: Array<{
    _id?: string
    title: string
    moduleItems: Array<{ _id?: string; title: string; type: 'video' | 'file'; url: string }>
  }>
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
  type: 'video' | 'file'
  url: string
  duration?: number
  moduleId: string
  courseId: string
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Request: Attach stored JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response: Normalize errors and evict stale session on 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nexus_token')
      localStorage.removeItem('nexus_user')
      window.dispatchEvent(new Event('nexus:unauthorized'))
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
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
}

// ─── Courses API ─────────────────────────────────────────────────────────────

export const coursesApi = {
  getAll: async (filter?: 'published' | 'archived') => {
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

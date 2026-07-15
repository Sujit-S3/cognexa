import axios, { AxiosError, type AxiosResponse } from 'axios'

export interface UserAttrs {
  _id?: string
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request Interceptor: Attach JWT Token from localStorage if available
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

// Response Interceptor: Normalize Errors and handle 401 Unauthorized
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nexus_token')
      localStorage.removeItem('nexus_user')
      // Dispatch custom event so Zustand authStore can react cleanly without circular dependencies
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

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
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
  }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', payload)
    return res.data
  },

  logout: async (): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>('/auth/logout')
    return res.data
  },

  getMe: async (): Promise<UserAttrs> => {
    const res = await api.get<UserAttrs>('/auth/me')
    return res.data
  },

  recoverPassword: async (email: string): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>('/auth/recover', { email })
    return res.data
  },

  verifyResetToken: async (token: string): Promise<{ valid: boolean }> => {
    const res = await api.get<{ valid: boolean }>(`/auth/reset/${token}`)
    return res.data
  },

  resetPassword: async (
    token: string,
    payload: { password: string; passwordConfirm: string }
  ): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>(`/auth/reset/${token}`, payload)
    return res.data
  },

  updateMe: async (payload: Partial<UserAttrs>): Promise<AuthResponse> => {
    const res = await api.patch<AuthResponse>('/auth/me', payload)
    return res.data
  },
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

export const coursesApi = {
  getAll: async (filter?: 'published' | 'archived'): Promise<CourseView[]> => {
    const res = await api.get<CourseView[]>('/courses', { params: filter ? { filter } : {} })
    return res.data
  },

  getOne: async (courseId: string): Promise<CourseView> => {
    const res = await api.get<CourseView>(`/courses/${courseId}`)
    return res.data
  },

  create: async (payload: { courseName: string; description?: string; image?: string }): Promise<CourseView[]> => {
    const res = await api.post<CourseView[]>('/courses', payload)
    return res.data
  },

  update: async (courseId: string, payload: Partial<CourseView>): Promise<CourseView> => {
    const res = await api.put<CourseView>(`/courses/${courseId}`, payload)
    return res.data
  },

  delete: async (courseId: string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/courses/${courseId}`)
    return res.data
  },

  enroll: async (courseId: string): Promise<CourseView> => {
    const res = await api.post<CourseView>(`/courses/${courseId}/enroll`)
    return res.data
  },

  unEnroll: async (courseId: string): Promise<CourseView> => {
    const res = await api.post<CourseView>(`/courses/${courseId}/un-enroll`)
    return res.data
  },
}

export const deadlinesApi = {
  getDeadlines: async (): Promise<DeadlineView[]> => {
    const res = await api.get<DeadlineView[]>('/deadlines')
    return res.data
  },
}


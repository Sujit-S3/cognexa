import { create } from 'zustand'
import type { CourseWorkspace } from '../../services/api'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface CourseBuilderState {
  course: CourseWorkspace | null
  localRevision: number
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  error: string | null
  initialize: (course: CourseWorkspace) => void
  updateCourse: (updater: (course: CourseWorkspace) => CourseWorkspace) => void
  markSaving: () => void
  acceptSaved: (course: CourseWorkspace, revision: number) => void
  markError: (message: string) => void
  reset: () => void
}

export const useCourseBuilderStore = create<CourseBuilderState>((set, get) => ({
  course: null,
  localRevision: 0,
  saveStatus: 'idle',
  lastSavedAt: null,
  error: null,

  initialize: (course) =>
    set({
      course,
      localRevision: 0,
      saveStatus: 'saved',
      lastSavedAt: course.updatedAt ? new Date(course.updatedAt) : null,
      error: null,
    }),

  updateCourse: (updater) => {
    const current = get().course
    if (!current) return
    set({
      course: updater(current),
      localRevision: get().localRevision + 1,
      saveStatus: 'dirty',
      error: null,
    })
  },

  markSaving: () => set({ saveStatus: 'saving', error: null }),

  acceptSaved: (savedCourse, revision) => {
    const state = get()
    if (state.localRevision === revision) {
      set({
        course: savedCourse,
        saveStatus: 'saved',
        lastSavedAt: new Date(),
        error: null,
      })
      return
    }

    set({
      course: state.course
        ? { ...state.course, draftVersion: savedCourse.draftVersion, updatedAt: savedCourse.updatedAt }
        : savedCourse,
      saveStatus: 'dirty',
      lastSavedAt: new Date(),
    })
  },

  markError: (message) => set({ saveStatus: 'error', error: message }),

  reset: () =>
    set({
      course: null,
      localRevision: 0,
      saveStatus: 'idle',
      lastSavedAt: null,
      error: null,
    }),
}))

import { create } from 'zustand'
import type { SubmissionAnswerView } from '../../services/api'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface QuizAttemptState {
  submissionId: string | null
  answers: Record<string, string[]>
  localRevision: number
  saveStatus: SaveStatus
  error: string | null
  initialize: (submissionId: string, answers: SubmissionAnswerView[]) => void
  setAnswer: (questionId: string, response: string[]) => void
  markSaving: () => void
  acceptSaved: (revision: number) => void
  markError: (message: string) => void
  reset: () => void
}

// Mirrors features/instructor/courseBuilderStore.ts's debounced-autosave/revision-conflict shape,
// applied to a flat questionId -> response map instead of a whole course workspace.
export const useQuizAttemptStore = create<QuizAttemptState>((set, get) => ({
  submissionId: null,
  answers: {},
  localRevision: 0,
  saveStatus: 'idle',
  error: null,

  initialize: (submissionId, answers) =>
    set({
      submissionId,
      answers: Object.fromEntries(answers.map((answer) => [answer.questionId, answer.response])),
      localRevision: 0,
      saveStatus: 'saved',
      error: null,
    }),

  setAnswer: (questionId, response) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: response },
      localRevision: state.localRevision + 1,
      saveStatus: 'dirty',
      error: null,
    })),

  markSaving: () => set({ saveStatus: 'saving', error: null }),

  acceptSaved: (revision) => {
    // Only settle to 'saved' if nothing changed locally while the request was in flight —
    // otherwise leave it 'dirty' so the next debounce cycle picks up the newer edits.
    if (get().localRevision === revision) set({ saveStatus: 'saved', error: null })
  },

  markError: (message) => set({ saveStatus: 'error', error: message }),

  reset: () => set({ submissionId: null, answers: {}, localRevision: 0, saveStatus: 'idle', error: null }),
}))

export function answersToPayload(answers: Record<string, string[]>): SubmissionAnswerView[] {
  return Object.entries(answers).map(([questionId, response]) => ({ questionId, response }))
}

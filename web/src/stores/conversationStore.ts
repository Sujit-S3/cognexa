import { create } from 'zustand'
import type { AIMessage } from '../services/ai.service'

export interface ConversationThread {
  id: string
  title: string
  mode: 'tutor' | 'notes' | 'summary' | 'flashcards' | 'quiz' | 'code' | 'career'
  messages: AIMessage[]
  context?: string
  createdAt: number
  updatedAt: number
}

interface ConversationState {
  threads: ConversationThread[]
  activeThreadId: string | null

  createThread: (mode: ConversationThread['mode'], title?: string, context?: string) => string
  appendMessage: (threadId: string, message: AIMessage) => void
  setActiveThread: (id: string | null) => void
  clearThread: (id: string) => void
  deleteThread: (id: string) => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  threads: [],
  activeThreadId: null,

  createThread: (mode, title, context) => {
    const id = crypto.randomUUID()
    const thread: ConversationThread = {
      id,
      title: title ?? `${mode.charAt(0).toUpperCase() + mode.slice(1)} — ${new Date().toLocaleTimeString()}`,
      mode,
      messages: [],
      context,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    set((s) => ({ threads: [thread, ...s.threads], activeThreadId: id }))
    return id
  },

  appendMessage: (threadId, message) => {
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, messages: [...t.messages, message], updatedAt: Date.now() }
          : t
      ),
    }))
  },

  setActiveThread: (id) => set({ activeThreadId: id }),

  clearThread: (threadId) => {
    set((s) => ({
      threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [], updatedAt: Date.now() } : t)),
    }))
  },

  deleteThread: (threadId) => {
    const { activeThreadId } = get()
    set((s) => ({
      threads: s.threads.filter((t) => t.id !== threadId),
      activeThreadId: activeThreadId === threadId ? null : activeThreadId,
    }))
  },
}))

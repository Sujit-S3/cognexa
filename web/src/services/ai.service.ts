import { api } from './api'

export type AIProvider = 'mock' | 'http' | 'server'
export type AIRole = 'user' | 'assistant' | 'system'

export interface AIMessage {
  id: string
  role: AIRole
  content: string
  timestamp: number
}

export interface AICompletionRequest {
  messages: AIMessage[]
  context?: string
  maxTokens?: number
  temperature?: number
}

export interface AICompletionResponse {
  content: string
  provider: AIProvider
  tokensUsed?: number
}

export const PROMPT_TEMPLATES = {
  tutor: (topic: string, context?: string) =>
    `You are Cognexa, an expert tutor for advanced technical subjects.\nTopic: ${topic}\n${context ? `Context: ${context}` : ''}\nProvide a clear, structured explanation and check the learner's understanding.`,
  summarize: (content: string) =>
    `Summarize this lecture into concise student review notes with key terms and takeaways:\n${content}`,
  flashcards: (topic: string, count = 5) =>
    `Generate ${count} flashcards for ${topic}. Format each as Q: [question] then A: [answer].`,
  quizGenerator: (topic: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium', count = 3) =>
    `Generate ${count} ${difficulty} multiple-choice questions about ${topic}. Include four options, the correct answer, and an explanation.`,
  codeReview: (code: string, language = 'typescript') =>
    `Review this ${language} code for correctness, performance, security, accessibility, and maintainability:\n\`\`\`${language}\n${code}\n\`\`\``,
  roadmap: (goal: string, level: string) =>
    `Create a learning roadmap for this goal: ${goal}. Current level: ${level}. Include a timeline, milestones, projects, and measurable outcomes.`,
  weakTopics: (quizResults: string) =>
    `Identify weak areas in these quiz results and recommend targeted practice:\n${quizResults}`,
} as const

async function mockComplete(request: AICompletionRequest): Promise<AICompletionResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 500))
  const prompt = request.messages.at(-1)?.content ?? ''
  return {
    provider: 'mock',
    tokensUsed: 92,
    content: `**Cognexa mock tutor**\n\nI received your question: “${prompt.slice(0, 240)}”\n\nRun the API with a configured AI service for a full, course-aware response.`,
  }
}

export async function aiComplete(request: AICompletionRequest): Promise<AICompletionResponse> {
  // Mock mode is an explicit local-development choice. All real providers are
  // reached through the authenticated API so vendor credentials never ship in
  // the JavaScript bundle.
  if (import.meta.env.VITE_AI_PROVIDER === 'mock') return mockComplete(request)

  const response = await api.post<AICompletionResponse>('/ai/complete', {
    messages: request.messages.map(({ role, content }) => ({ role, content })),
    context: request.context,
    maxTokens: request.maxTokens,
    temperature: request.temperature,
  })
  return response.data
}

export function buildSystemMessage(role: string, context?: string): AIMessage {
  return {
    id: `sys-${Date.now()}`,
    role: 'system',
    content: PROMPT_TEMPLATES.tutor(role, context),
    timestamp: Date.now(),
  }
}

export function createMessage(role: AIRole, content: string): AIMessage {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now() }
}

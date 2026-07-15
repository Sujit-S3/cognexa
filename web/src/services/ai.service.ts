/**
 * NEXUS AI — AI Service Layer
 * Provider-agnostic architecture. Swap providers via VITE_AI_PROVIDER env var.
 * Supported providers: 'mock' | 'gemini' | 'openai' | 'anthropic'
 */

export type AIProvider = 'mock' | 'gemini' | 'openai' | 'anthropic'
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

// ── Prompt templates ────────────────────────────────────────────────────────

export const PROMPT_TEMPLATES = {
  tutor: (topic: string, context?: string) =>
    `You are NEXUS AI, an expert AI tutor for advanced technical subjects.
Topic: ${topic}
${context ? `Context: ${context}` : ''}
Provide clear, structured explanations with code examples where appropriate. Be concise but thorough.`,

  summarize: (content: string) =>
    `You are NEXUS AI. Summarize the following lecture content into clear, concise bullet points for a student review card:
${content}`,

  flashcards: (topic: string, count = 5) =>
    `You are NEXUS AI. Generate ${count} flashcards for: ${topic}
Format each as:
Q: [question]
A: [answer]`,

  quizGenerator: (topic: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium', count = 3) =>
    `You are NEXUS AI. Generate ${count} ${difficulty} multiple-choice quiz questions about: ${topic}
Format each as JSON: { "question": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "..." }`,

  codeReview: (code: string, language = 'typescript') =>
    `You are NEXUS AI, a senior software engineer. Review this ${language} code for correctness, performance, security issues, and best practices:
\`\`\`${language}
${code}
\`\`\`
Provide specific, actionable feedback.`,

  roadmap: (goal: string, level: string) =>
    `You are NEXUS AI Career Coach. Create a detailed learning roadmap for someone who wants to: ${goal}
Current level: ${level}
Include: timeline, key milestones, recommended resources, and skills to develop.`,

  weakTopics: (quizResults: string) =>
    `You are NEXUS AI. Based on these quiz results, identify the student's weak areas and suggest targeted exercises:
${quizResults}`,
} as const

// ── Mock Provider ────────────────────────────────────────────────────────────

const MOCK_RESPONSES: Record<string, string> = {
  default:
    '**NEXUS AI** is ready. Connect a real API key via `VITE_AI_API_KEY` and set `VITE_AI_PROVIDER` to `gemini`, `openai`, or `anthropic` to enable full AI capabilities.',
  tutor:
    "Great question! Let me break this down step by step.\n\n**Key Concept:** The Jacobian matrix maps joint velocity space to Cartesian velocity space. By computing its pseudoinverse (using SVD), we can solve for joint velocities that produce desired end-effector motion.\n\n**Python Example:**\n```python\nimport numpy as np\n\ndef jacobian_pseudoinverse(J, lambda_=0.001):\n    # Damped least squares for stability near singularities\n    JJT = J @ J.T\n    return J.T @ np.linalg.inv(JJT + lambda_**2 * np.eye(JJT.shape[0]))\n```\n\nThis avoids division-by-zero near singular configurations. Do you want me to elaborate on any part?",
  summarize:
    '**Lecture Summary**\n\n• **Topic:** Inverse Kinematics using Quaternion Algebra\n• Quaternions avoid gimbal lock inherent in Euler angles\n• SLERP (Spherical Linear Interpolation) provides smooth rotational transitions\n• Jacobian pseudoinverse computes stable joint velocities near singularities\n• Damped Least Squares adds regularization λ² to prevent instability\n\n*Key takeaway: Use quaternions for rotation representation and DLS Jacobian for IK.*',
  flashcards:
    'Q: What is gimbal lock?\nA: Loss of one degree of freedom in Euler angle representation when two rotation axes align, causing singularities.\n\nQ: What does SLERP stand for?\nA: Spherical Linear Interpolation — smooth rotation interpolation along the great arc between two quaternions.\n\nQ: What is the pseudoinverse used for in robotics?\nA: To compute the minimum-norm least-squares solution for joint velocities in overdetermined or underdetermined IK systems.\n\nQ: Why use quaternions instead of Euler angles?\nA: Quaternions are numerically stable, don\'t suffer from gimbal lock, and interpolate smoothly.\n\nQ: What is the Jacobian matrix in robotics?\nA: A matrix relating joint velocities to end-effector velocities in Cartesian space.',
}

function getMockResponse(prompt: string): string {
  if (prompt.includes('summarize') || prompt.includes('Summarize')) return MOCK_RESPONSES.summarize
  if (prompt.includes('flashcard') || prompt.includes('Flashcard')) return MOCK_RESPONSES.flashcards
  if (prompt.toLowerCase().includes('tutor') || prompt.toLowerCase().includes('explain')) return MOCK_RESPONSES.tutor
  return MOCK_RESPONSES.default
}

async function mockComplete(req: AICompletionRequest): Promise<AICompletionResponse> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600))
  const lastMsg = req.messages[req.messages.length - 1]
  return {
    content: getMockResponse(lastMsg.content + (req.context ?? '')),
    provider: 'mock',
    tokensUsed: 180,
  }
}

// ── Gemini Provider ──────────────────────────────────────────────────────────

async function geminiComplete(req: AICompletionRequest): Promise<AICompletionResponse> {
  const apiKey = import.meta.env.VITE_AI_API_KEY
  if (!apiKey) throw new Error('VITE_AI_API_KEY is not set for Gemini provider')

  const contents = req.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

  const systemInstruction = req.messages.find((m) => m.role === 'system')
  const body: Record<string, unknown> = { contents }
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction.content }] }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!resp.ok) throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}`)
  const data = await resp.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '(no response)'
  return { content: text, provider: 'gemini', tokensUsed: data?.usageMetadata?.totalTokenCount }
}

// ── OpenAI Provider ──────────────────────────────────────────────────────────

async function openaiComplete(req: AICompletionRequest): Promise<AICompletionResponse> {
  const apiKey = import.meta.env.VITE_AI_API_KEY
  if (!apiKey) throw new Error('VITE_AI_API_KEY is not set for OpenAI provider')

  const messages = req.messages.map((m) => ({ role: m.role, content: m.content }))
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.7,
    }),
  })
  if (!resp.ok) throw new Error(`OpenAI API error: ${resp.status} ${resp.statusText}`)
  const data = await resp.json()
  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    tokensUsed: data.usage?.total_tokens,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

const PROVIDER: AIProvider = (import.meta.env.VITE_AI_PROVIDER as AIProvider) ?? 'mock'

export async function aiComplete(req: AICompletionRequest): Promise<AICompletionResponse> {
  switch (PROVIDER) {
    case 'gemini':   return geminiComplete(req)
    case 'openai':   return openaiComplete(req)
    case 'anthropic':
      // Anthropic requires a proxy — fall through to mock with a warning
      console.warn('Anthropic provider requires a server-side proxy. Using mock.')
      return mockComplete(req)
    default:
      return mockComplete(req)
  }
}

export function buildSystemMessage(role: string, context?: string): AIMessage {
  return {
    id: 'sys-' + Date.now(),
    role: 'system',
    content: PROMPT_TEMPLATES.tutor(role, context),
    timestamp: Date.now(),
  }
}

export function createMessage(role: AIRole, content: string): AIMessage {
  return { id: crypto.randomUUID(), role, content, timestamp: Date.now() }
}

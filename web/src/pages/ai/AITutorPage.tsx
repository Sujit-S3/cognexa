import { useState, useRef, useEffect } from 'react'
import { GlassCard, Badge, Button } from '../../design'
import { aiComplete, createMessage, buildSystemMessage, PROMPT_TEMPLATES, type AIMessage } from '../../services/ai.service'
import { useConversationStore } from '../../stores/conversationStore'
import styles from './AITutorPage.module.css'

const AI_MODES = [
  { id: 'tutor',      label: 'AI Tutor',      icon: '🤖', desc: 'Interactive Q&A on any topic' },
  { id: 'summary',    label: 'Summarize',     icon: '📋', desc: 'Condense lecture content' },
  { id: 'flashcards', label: 'Flashcards',    icon: '🃏', desc: 'Generate study cards' },
  { id: 'quiz',       label: 'Quiz Gen',      icon: '🎯', desc: 'Auto-generate MCQ quiz' },
  { id: 'code',       label: 'Code Review',   icon: '💻', desc: 'Review and improve code' },
  { id: 'career',     label: 'Career Coach',  icon: '🚀', desc: 'Roadmaps and interview prep' },
] as const

type AIMode = (typeof AI_MODES)[number]['id']

const STARTERS: Record<AIMode, string[]> = {
  tutor:      ['Explain quaternion algebra', 'How does GLSL fragment shading work?', 'What is backpropagation?'],
  summary:    ['Summarize: Inverse kinematics involves computing joint angles from end-effector positions using Jacobian matrices.'],
  flashcards: ['Generate flashcards on: Neural Networks and Backpropagation'],
  quiz:       ['Generate a quiz on: Distributed Systems consensus algorithms'],
  code:       ['Review this code:\n```typescript\nfunction add(a: number, b: number) { return a + b }```'],
  career:     ['Create a learning roadmap to become an AI engineer', 'How to prepare for FAANG system design interviews?'],
}

function renderMarkdown(text: string) {
  // Minimal markdown: bold, code blocks, bullet lists
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (line) => (line.startsWith('<') ? line : `<p>${line}</p>`))
}

export function AITutorPage() {
  const [mode, setMode] = useState<AIMode>('tutor')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { createThread, appendMessage } = useConversationStore()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || loading) return
    setError(null)

    const userMsg = createMessage('user', userText.trim())
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Build context-aware messages
      const systemMsg = buildSystemMessage(mode)
      const contextMsg = (() => {
        switch (mode) {
          case 'summary':    return createMessage('user', PROMPT_TEMPLATES.summarize(userText))
          case 'flashcards': return createMessage('user', PROMPT_TEMPLATES.flashcards(userText))
          case 'quiz':       return createMessage('user', PROMPT_TEMPLATES.quizGenerator(userText))
          case 'code':       return createMessage('user', PROMPT_TEMPLATES.codeReview(userText))
          case 'career':     return createMessage('user', PROMPT_TEMPLATES.roadmap(userText, 'intermediate'))
          default:           return userMsg
        }
      })()

      const resp = await aiComplete({
        messages: [systemMsg, ...messages.slice(-6), contextMsg],
        maxTokens: 1024,
      })

      const aiMsg = createMessage('assistant', resp.content)
      setMessages((prev) => [...prev, aiMsg])

      // Persist to conversation store
      const threadId = createThread(mode as never, `${mode} chat`, undefined)
      appendMessage(threadId, userMsg)
      appendMessage(threadId, aiMsg)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI service error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  return (
    <div className={styles.container}>
      {/* Mode selector */}
      <div className={styles.modeBar}>
        {AI_MODES.map((m) => (
          <button
            key={m.id}
            className={`${styles.modeBtn} ${mode === m.id ? styles.modeBtnActive : ''}`}
            onClick={() => setMode(m.id)}
            title={m.desc}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        {/* Chat panel */}
        <GlassCard elevation="raised" glow className={styles.chatPanel}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
                {AI_MODES.find((m) => m.id === mode)?.icon} NEXUS AI —{' '}
                {AI_MODES.find((m) => m.id === mode)?.label}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--nx-fg-muted)', marginTop: '2px' }}>
                {AI_MODES.find((m) => m.id === mode)?.desc}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Badge tone="success">
                {import.meta.env.VITE_AI_PROVIDER === 'gemini' ? 'Gemini' :
                 import.meta.env.VITE_AI_PROVIDER === 'openai' ? 'GPT-4o' : 'Mock AI'}
              </Badge>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearChat} style={{ color: 'var(--nx-fg-muted)', fontSize: '0.8rem' }}>
                  Clear ✕
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messagesFeed}>
            {messages.length === 0 && (
              <div className={styles.emptyState}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                  {AI_MODES.find((m) => m.id === mode)?.icon}
                </div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>
                  Start a conversation with NEXUS AI
                </div>
                <p style={{ color: 'var(--nx-fg-muted)', fontSize: '0.88rem', maxWidth: '380px' }}>
                  {AI_MODES.find((m) => m.id === mode)?.desc}. Try one of the starters below or type your own question.
                </p>
                <div className={styles.starters}>
                  {STARTERS[mode].map((s) => (
                    <button key={s} className={styles.starter} onClick={() => sendMessage(s)}>
                      {s.length > 60 ? s.slice(0, 60) + '…' : s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAI}`}
              >
                {msg.role === 'assistant' && (
                  <div className={styles.aiAvatar}>🤖</div>
                )}
                <div className={styles.bubble}>
                  {msg.role === 'assistant' ? (
                    <div
                      className={styles.markdownContent}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : (
                    <div>{msg.content}</div>
                  )}
                  <div className={styles.timestamp}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className={`${styles.message} ${styles.messageAI}`}>
                <div className={styles.aiAvatar}>🤖</div>
                <div className={styles.bubble}>
                  <div className={styles.typingDots}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                ⚠️ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputRow}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder={`Ask NEXUS AI anything about ${AI_MODES.find((m) => m.id === mode)?.label.toLowerCase()}… (Enter to send, Shift+Enter for newline)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />
            <Button
              magnetic
              glow
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{ padding: '14px 20px', alignSelf: 'flex-end', flexShrink: 0 }}
            >
              {loading ? '⏳' : '⚡ Send'}
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

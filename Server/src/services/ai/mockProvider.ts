import { logger } from '../../config/logger'
import {
  AiServiceProvider,
  GradeQuestionInput,
  GradeQuestionResult,
  PlagiarismCheckInput,
  PlagiarismMatch,
  RecommendationInput,
  TutorCompletionInput,
  TutorCompletionResult,
} from './types'

// Deterministic, side-effect-free provider used whenever AI_SERVICE_URL isn't configured.
// Replaces the previous behavior of silently failing against hardcoded 127.0.0.1:5000 / empty
// string URLs — every AI touchpoint now degrades gracefully instead of throwing or no-op'ing.
export const mockAiProvider: AiServiceProvider = {
  name: 'mock',

  async gradeOnlineSubmission(answers: GradeQuestionInput[]): Promise<GradeQuestionResult[]> {
    logger.debug({ count: answers.length }, 'mockAiProvider.gradeOnlineSubmission')
    return answers.map((answer) => ({
      score: answer.studentAnswer.trim().length > 0 ? Math.round(answer.maxScore * 0.5) : 0,
      feedback: 'Auto-grading is running in mock mode — configure AI_SERVICE_URL for real grading.',
    }))
  },

  async gradeWrittenSubmission(): Promise<GradeQuestionResult[]> {
    return []
  },

  async checkPlagiarism(inputs: PlagiarismCheckInput[]): Promise<PlagiarismMatch[]> {
    logger.debug({ count: inputs.length }, 'mockAiProvider.checkPlagiarism')
    return []
  },

  async reportCheatingSignal(input): Promise<void> {
    logger.info({ input }, 'mockAiProvider.reportCheatingSignal (no-op, AI_SERVICE_URL not configured)')
  },

  async getRecommendedContentIds(input: RecommendationInput): Promise<number[]> {
    logger.debug({ input }, 'mockAiProvider.getRecommendedContentIds')
    return []
  },

  async completeTutor(input: TutorCompletionInput): Promise<TutorCompletionResult> {
    const prompt = input.messages.at(-1)?.content ?? ''
    return {
      provider: 'mock',
      tokensUsed: 96,
      content: `**Cognexa mock tutor**\n\nI received your question: “${prompt.slice(0, 240)}”\n\nConnect the server-side AI service to provide a full, course-aware answer. No AI credential is ever sent to the browser.`,
    }
  },
}

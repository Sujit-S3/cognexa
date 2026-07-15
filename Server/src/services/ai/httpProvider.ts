import axios from 'axios'
import { env } from '../../config/env'
import { logger } from '../../config/logger'
import {
  AiServiceProvider,
  GradeQuestionInput,
  GradeQuestionResult,
  PlagiarismCheckInput,
  PlagiarismMatch,
  RecommendationInput
} from './types'

// Calls an external AI/ML service over HTTP, configured via AI_SERVICE_URL/AI_SERVICE_API_KEY.
// This replaces the old hardcoded `http://127.0.0.1:5000/...` calls scattered across controllers.
const client = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 15_000,
  headers: env.AI_SERVICE_API_KEY ? { Authorization: `Bearer ${env.AI_SERVICE_API_KEY}` } : undefined
})

export const httpAiProvider: AiServiceProvider = {
  name: 'http',

  async gradeOnlineSubmission(answers: GradeQuestionInput[]): Promise<GradeQuestionResult[]> {
    const { data } = await client.post<GradeQuestionResult[]>('/grade/online', { answers })
    return data
  },

  async gradeWrittenSubmission(input): Promise<GradeQuestionResult[]> {
    const { data } = await client.post<GradeQuestionResult[]>('/grade/written', input)
    return data
  },

  async checkPlagiarism(inputs: PlagiarismCheckInput[]): Promise<PlagiarismMatch[]> {
    const { data } = await client.post<PlagiarismMatch[]>('/plagiarism/check', { submissions: inputs })
    return data
  },

  async reportCheatingSignal(input): Promise<void> {
    try {
      await client.post('/proctoring/report', input)
    } catch (err) {
      logger.error({ err }, 'AI service reportCheatingSignal failed')
    }
  },

  async getRecommendedContentIds(input: RecommendationInput): Promise<number[]> {
    const { data } = await client.get<number[]>(`/recommend/${input.userCode}/${input.limit}/${input.offset}`)
    return data
  }
}

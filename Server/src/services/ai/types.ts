// Pluggable AI service contract. Every AI-touching feature in NEXUS AI (auto-grading, plagiarism
// detection, cheating-detection alerts, content recommendations, and — from Phase 4 onward — the
// tutor/quiz-generator/flashcards/etc. surfaces) goes through this interface. The real ML models
// live outside this repo (see README); providers below let us swap between a safe mock and a real
// HTTP-backed service purely via env config, with no controller code changes.

export interface GradeQuestionInput {
  questionText: string
  modelAnswer: string
  studentAnswer: string
  maxScore: number
}

export interface GradeQuestionResult {
  score: number
  feedback?: string
}

export interface PlagiarismCheckInput {
  submissionId: string
  text: string
}

export interface PlagiarismMatch {
  submissionId: string
  againstSubmissionId: string
  similarity: number // 0-1
}

export interface RecommendationInput {
  userCode: number
  limit: number
  offset: number
}

export interface AiServiceProvider {
  name: 'mock' | 'http'
  gradeOnlineSubmission(answers: GradeQuestionInput[]): Promise<GradeQuestionResult[]>
  gradeWrittenSubmission(input: { modelAnswer: string; studentAnswerUrl: string }): Promise<GradeQuestionResult[]>
  checkPlagiarism(inputs: PlagiarismCheckInput[]): Promise<PlagiarismMatch[]>
  reportCheatingSignal(input: {
    userId: string
    examId: string
    examType: string
    instructorEmails: string[]
  }): Promise<void>
  getRecommendedContentIds(input: RecommendationInput): Promise<number[]>
}

import { BuilderQuestionAttrs } from '../../models/course.model'

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface AnswerInput {
  questionId: string
  response: string[]
}

// All four question types compare a learner's response against the authored correct answer(s)
// as string sets — mcq/true_false expect exactly one matching value, multiple_select is
// all-or-nothing set equality (the schema has no partial-credit field to key off), and
// fill_blank matches (normalized) against any accepted phrasing.
export function isAnswerCorrect(
  question: Pick<BuilderQuestionAttrs, 'type' | 'correctAnswers'>,
  response: string[]
): boolean {
  const correct = question.correctAnswers
  switch (question.type) {
    case 'mcq':
    case 'true_false':
      return response.length === 1 && correct.length === 1 && response[0] === correct[0]
    case 'multiple_select': {
      if (response.length !== correct.length) return false
      const correctSet = new Set(correct)
      return response.every((value) => correctSet.has(value))
    }
    case 'fill_blank': {
      if (response.length !== 1 || response[0] === undefined) return false
      const normalizedResponse = normalize(response[0])
      return correct.some((accepted) => normalize(accepted) === normalizedResponse)
    }
    default:
      return false
  }
}

export interface GradedQuestionResult {
  questionId: string
  correct: boolean
  pointsAwarded: number
  pointsPossible: number
}

export interface QuizGradeResult {
  score: number
  maxScore: number
  percent: number
  passed: boolean
  results: GradedQuestionResult[]
}

// `questions` is read fresh from the live course document at grading time (not a frozen copy of
// the answer key) — see assessments.controller.ts for why: it avoids storing a second copy of
// sensitive correct-answer data at rest. A question deleted after the attempt started is simply
// worth 0 instead of failing the whole grading pass.
export function gradeQuizAttempt(
  questions: Array<
    Pick<BuilderQuestionAttrs, 'type' | 'correctAnswers' | 'points'> & { _id: { toString(): string } }
  >,
  answers: AnswerInput[],
  passingScore: number
): QuizGradeResult {
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer.response]))

  const results = questions.map((question) => {
    const questionId = String(question._id)
    const response = answersByQuestion.get(questionId) ?? []
    const correct = response.length > 0 && isAnswerCorrect(question, response)
    return {
      questionId,
      correct,
      pointsAwarded: correct ? question.points : 0,
      pointsPossible: question.points,
    }
  })

  const score = results.reduce((sum, result) => sum + result.pointsAwarded, 0)
  const maxScore = results.reduce((sum, result) => sum + result.pointsPossible, 0)
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100)

  return { score, maxScore, percent, passed: percent >= passingScore, results }
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return result
}

// A pool smaller than the full bank only means something if selection is random — so pool
// sampling always shuffles first, even when randomizeQuestions is off; randomizeQuestions alone
// (no pool) shuffles the full set's order without reducing it.
export function selectAttemptQuestions<T>(
  questions: T[],
  options: { questionPoolSize?: number; randomizeQuestions: boolean }
): T[] {
  const needsSampling = Boolean(options.questionPoolSize && options.questionPoolSize < questions.length)
  const ordered = options.randomizeQuestions || needsSampling ? shuffle(questions) : questions
  return needsSampling ? ordered.slice(0, options.questionPoolSize) : ordered
}

export function maybeShuffleOptions(options: string[], randomizeAnswers: boolean): string[] {
  return randomizeAnswers ? shuffle(options) : options
}

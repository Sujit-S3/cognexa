import { describe, expect, it } from 'vitest'
import {
  gradeQuizAttempt,
  isAnswerCorrect,
  maybeShuffleOptions,
  selectAttemptQuestions,
} from '../modules/assessments/assessments.grading'

describe('isAnswerCorrect', () => {
  it('grades mcq as correct only for an exact single match', () => {
    const question = { type: 'mcq' as const, correctAnswers: ['B'] }
    expect(isAnswerCorrect(question, ['B'])).toBe(true)
    expect(isAnswerCorrect(question, ['A'])).toBe(false)
    expect(isAnswerCorrect(question, ['A', 'B'])).toBe(false)
  })

  it('grades true_false the same way as mcq', () => {
    const question = { type: 'true_false' as const, correctAnswers: ['true'] }
    expect(isAnswerCorrect(question, ['true'])).toBe(true)
    expect(isAnswerCorrect(question, ['false'])).toBe(false)
  })

  it('grades multiple_select all-or-nothing on set equality', () => {
    const question = { type: 'multiple_select' as const, correctAnswers: ['A', 'C'] }
    expect(isAnswerCorrect(question, ['C', 'A'])).toBe(true)
    expect(isAnswerCorrect(question, ['A'])).toBe(false)
    expect(isAnswerCorrect(question, ['A', 'B'])).toBe(false)
    expect(isAnswerCorrect(question, ['A', 'B', 'C'])).toBe(false)
  })

  it('grades fill_blank against any accepted phrasing, normalized', () => {
    const question = { type: 'fill_blank' as const, correctAnswers: ['Paris', 'City of Light'] }
    expect(isAnswerCorrect(question, ['  paris  '])).toBe(true)
    expect(isAnswerCorrect(question, ['city   of    light'])).toBe(true)
    expect(isAnswerCorrect(question, ['London'])).toBe(false)
  })

  it('never awards credit for an empty response', () => {
    expect(isAnswerCorrect({ type: 'mcq' as const, correctAnswers: ['A'] }, [])).toBe(false)
    expect(isAnswerCorrect({ type: 'fill_blank' as const, correctAnswers: ['A'] }, [])).toBe(false)
  })
})

describe('gradeQuizAttempt', () => {
  const questions = [
    { _id: 'q1', type: 'mcq' as const, correctAnswers: ['A'], points: 2 },
    { _id: 'q2', type: 'multiple_select' as const, correctAnswers: ['A', 'B'], points: 3 },
    { _id: 'q3', type: 'fill_blank' as const, correctAnswers: ['blue'], points: 1 },
  ]

  it('sums points across correct answers and computes a percentage', () => {
    const result = gradeQuizAttempt(
      questions,
      [
        { questionId: 'q1', response: ['A'] },
        { questionId: 'q2', response: ['A', 'B'] },
        { questionId: 'q3', response: ['red'] },
      ],
      70
    )

    expect(result).toMatchObject({ score: 5, maxScore: 6, percent: 83, passed: true })
    expect(result.results.find((r) => r.questionId === 'q3')).toMatchObject({ correct: false })
  })

  it('treats an unanswered question as worth zero rather than throwing', () => {
    const result = gradeQuizAttempt(questions, [{ questionId: 'q1', response: ['A'] }], 50)
    expect(result).toMatchObject({ score: 2, maxScore: 6, percent: 33, passed: false })
  })

  it('scores 0 for a question that no longer exists in the live course (deleted after attempt start)', () => {
    const result = gradeQuizAttempt([], [{ questionId: 'q1', response: ['A'] }], 50)
    expect(result).toMatchObject({ score: 0, maxScore: 0, percent: 0, passed: false })
  })

  it('applies the passing score threshold as an inclusive boundary', () => {
    const result = gradeQuizAttempt(
      [{ _id: 'q1', type: 'mcq' as const, correctAnswers: ['A'], points: 1 }],
      [{ questionId: 'q1', response: ['A'] }],
      100
    )
    expect(result.passed).toBe(true)
  })
})

describe('selectAttemptQuestions', () => {
  const questions = ['a', 'b', 'c', 'd', 'e']

  it('returns every question in original order when no pool or randomization is set', () => {
    expect(selectAttemptQuestions(questions, { randomizeQuestions: false })).toEqual(questions)
  })

  it('samples exactly questionPoolSize questions from the full bank', () => {
    const selected = selectAttemptQuestions(questions, { questionPoolSize: 2, randomizeQuestions: false })
    expect(selected).toHaveLength(2)
    selected.forEach((item) => expect(questions).toContain(item))
    expect(new Set(selected).size).toBe(2)
  })

  it('does not sample when questionPoolSize is not smaller than the bank', () => {
    const selected = selectAttemptQuestions(questions, { questionPoolSize: 10, randomizeQuestions: false })
    expect(selected).toHaveLength(questions.length)
  })

  it('preserves the full set (as a permutation) when only randomizeQuestions is set', () => {
    const selected = selectAttemptQuestions(questions, { randomizeQuestions: true })
    expect(selected).toHaveLength(questions.length)
    expect([...selected].sort()).toEqual([...questions].sort())
  })
})

describe('maybeShuffleOptions', () => {
  it('returns the same array reference contents unshuffled when disabled', () => {
    const options = ['x', 'y', 'z']
    expect(maybeShuffleOptions(options, false)).toEqual(options)
  })

  it('returns a permutation of the same options when enabled', () => {
    const options = ['x', 'y', 'z', 'w', 'v']
    const shuffled = maybeShuffleOptions(options, true)
    expect([...shuffled].sort()).toEqual([...options].sort())
  })
})

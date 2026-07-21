import mongoose, { Schema } from 'mongoose'
import { idTransform as toJsonTransform } from '../utils/mongoTransform'

const options = { discriminatorKey: 'type' }

export type QuestionType = 'MCQ' | 'Essay'

export interface QuestionAttrs {
  type: QuestionType
  question_number: number
  points: number
  question_text: string
  auto_graded: boolean
}

const questionSchema = new Schema<QuestionAttrs>(
  {
    type: { type: String, enum: ['MCQ', 'Essay'], required: true },
    question_number: { type: Number, required: true },
    points: { type: Number, required: true },
    question_text: { type: String, required: true },
    auto_graded: { type: Boolean, default: false },
  },
  options
)

questionSchema.set('toJSON', { transform: toJsonTransform })
questionSchema.set('toObject', { transform: toJsonTransform })

export const Question = mongoose.model('Question', questionSchema)

const choiceQuestionSchema = new Schema(
  {
    choices: [{ type: String, required: true }],
    ans: { type: String, required: true },
    text_match: { type: Boolean, default: false },
  },
  options
)

const writtenQuestionSchema = new Schema(
  {
    keywords: [
      {
        key_word: { type: String, required: true },
        weight: { type: Number, required: true },
        _id: false,
      },
    ],
    ans: { type: String, required: true },
    text_match: { type: Boolean, default: false },
  },
  options
)

export const ChoiceQuestion = Question.discriminator('MCQ', choiceQuestionSchema)
export const WrittenQuestion = Question.discriminator('Essay', writtenQuestionSchema)

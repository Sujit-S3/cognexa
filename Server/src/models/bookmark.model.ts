import mongoose, { Schema, Types } from 'mongoose'

export interface BookMarkedAttrs {
  bookedBy: Types.ObjectId
  article: Types.ObjectId
}

const bookMarkedSchema = new Schema<BookMarkedAttrs>(
  {
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    article: { type: Schema.Types.ObjectId, ref: 'Article', required: true }
  },
  { timestamps: true }
)

export const BookMarked = mongoose.model('BookMarked', bookMarkedSchema)

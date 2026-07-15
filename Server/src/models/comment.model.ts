import mongoose, { Schema, Types } from 'mongoose'

export interface CommentAttrs {
  createdBy: Types.ObjectId
  article: Types.ObjectId
  body: string
}

const commentSchema = new Schema<CommentAttrs>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    article: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
    body: { type: String, required: true }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
)

export const Comment = mongoose.model('Comment', commentSchema)

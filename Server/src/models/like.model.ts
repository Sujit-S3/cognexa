import mongoose, { Schema, Types } from 'mongoose'

export interface LikeAttrs {
  likedBy: Types.ObjectId
  article: Types.ObjectId
}

const likeSchema = new Schema<LikeAttrs>(
  {
    likedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    article: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
  },
  { timestamps: true }
)

export const Like = mongoose.model('Like', likeSchema)

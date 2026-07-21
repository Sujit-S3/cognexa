import mongoose, { Schema, Types } from 'mongoose'

export interface FollowAttrs {
  user: Types.ObjectId
  follows: Types.ObjectId
}

const followSchema = new Schema<FollowAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    follows: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

export const Follow = mongoose.model('Follow', followSchema)

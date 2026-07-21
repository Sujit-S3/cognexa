import mongoose, { Schema, Types } from 'mongoose'

export interface DiscussionCommentAttrs {
  user: Types.ObjectId
  data: string
}

const discussionCommentSchema = new Schema<DiscussionCommentAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: String, required: true },
  },
  { timestamps: true }
)

export interface DiscussionAttrs {
  user: Types.ObjectId
  course: Types.ObjectId
  data: string
  comments: Types.DocumentArray<DiscussionCommentAttrs>
}

const discussionSchema = new Schema<DiscussionAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    data: { type: String, required: true },
    comments: [discussionCommentSchema],
  },
  { timestamps: true }
)

export const Discussion = mongoose.model('Discussions', discussionSchema)

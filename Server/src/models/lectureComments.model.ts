import mongoose, { Schema, Types } from 'mongoose'
import { idTransform, stripInternalTransform } from '../utils/mongoTransform'

export interface LectureCommentAttrs {
  user: Types.ObjectId
  comment: string
}

const commentSchema = new Schema<LectureCommentAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true }
)
commentSchema.set('toJSON', { transform: idTransform })

export interface LectureCommentsAttrs {
  courseId: Types.ObjectId
  moduleItemId: Types.ObjectId
  comments: Types.DocumentArray<LectureCommentAttrs>
}

const lectureCommentsSchema = new Schema<LectureCommentsAttrs>({
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleItemId: { type: Schema.Types.ObjectId, ref: 'CourseModuleItem', required: true },
  comments: [commentSchema],
})
// Unique (not just indexed) — there is exactly one comment thread per module item, and
// lectures.controller.ts#createComment relies on this to make its upsert race-safe: two
// concurrent first-comments on the same lesson must not create two separate documents.
lectureCommentsSchema.index({ moduleItemId: 1 }, { unique: true })
lectureCommentsSchema.set('toJSON', { transform: stripInternalTransform })

export const LectureComments = mongoose.model('LectureComments', lectureCommentsSchema)

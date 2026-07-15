import mongoose, { Schema } from 'mongoose'

export type ViewEventType = 'FOLLOW' | 'LIKE' | 'COMMENT CREATED' | 'BOOKMARK' | 'VIEW'

export interface ViewAttrs {
  personId: number
  contentId: number
  eventType: ViewEventType
}

const viewSchema = new Schema<ViewAttrs>(
  {
    personId: { type: Number, required: true },
    contentId: { type: Number, required: true },
    eventType: { type: String, enum: ['FOLLOW', 'LIKE', 'COMMENT CREATED', 'BOOKMARK', 'VIEW'], required: true }
  },
  { timestamps: true }
)

export const View = mongoose.model('View', viewSchema)

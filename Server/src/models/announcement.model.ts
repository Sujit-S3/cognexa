import mongoose, { Schema, Types } from 'mongoose'

export interface AnnouncementAttrs {
  user: Types.ObjectId
  course: Types.ObjectId
  data: string
}

const announcementSchema = new Schema<AnnouncementAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    data: { type: String, required: true }
  },
  { timestamps: true }
)

export const Announcement = mongoose.model('Announcements', announcementSchema)

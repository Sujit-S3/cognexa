import mongoose, { Schema, Types } from 'mongoose'

export interface SessionAttrs {
  user: Types.ObjectId
  tokenHash: string
  expiresAt: Date
  lastSeenAt: Date
  userAgent?: string
  ipHash?: string
}

const sessionSchema = new Schema<SessionAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true, default: Date.now },
    userAgent: { type: String, maxlength: 512 },
    ipHash: { type: String, select: false },
  },
  { timestamps: true }
)

// MongoDB removes expired sessions without a cleanup job. The expiry is also
// checked by the service because TTL deletion is asynchronous.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
sessionSchema.index({ user: 1, lastSeenAt: -1 })

export const Session = mongoose.model<SessionAttrs>('Session', sessionSchema)

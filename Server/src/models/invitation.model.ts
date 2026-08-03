import mongoose, { HydratedDocument, Schema, Types } from 'mongoose'
import { idTransform } from '../utils/mongoTransform'
import type { OrganizationMemberRole } from './organization.model'

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface InvitationAttrs {
  organization: Types.ObjectId
  email: string
  role: OrganizationMemberRole
  token: string
  status: InvitationStatus
  invitedBy: Types.ObjectId
  expiresAt: Date
  createdAt: Date
}

export type InvitationDocument = HydratedDocument<InvitationAttrs>

const invitationSchema = new Schema<InvitationAttrs>(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], required: true },
    token: { type: String, required: true, select: false },
    status: { type: String, enum: ['pending', 'accepted', 'expired', 'revoked'], default: 'pending' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// No TTL index here (unlike session.model.ts's expiresAt) — a lapsed invitation must stay
// listable as 'expired' for the org admin's pending-invitations view, not silently vanish.
invitationSchema.index({ token: 1 }, { unique: true })
invitationSchema.index({ organization: 1, status: 1 })
invitationSchema.index({ email: 1, status: 1 })

invitationSchema.set('toJSON', { transform: idTransform })

export const Invitation = mongoose.model('Invitation', invitationSchema)

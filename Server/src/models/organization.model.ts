import mongoose, { HydratedDocument, Schema, Types } from 'mongoose'
import { idTransform } from '../utils/mongoTransform'

export type OrganizationMemberRole = 'owner' | 'admin' | 'member'

export interface OrganizationMemberAttrs {
  user: Types.ObjectId
  role: OrganizationMemberRole
  joinedAt: Date
}

const organizationMemberSchema = new Schema<OrganizationMemberAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], required: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
)

export interface OrganizationAttrs {
  name: string
  slug: string
  createdBy: Types.ObjectId
  members: Types.DocumentArray<OrganizationMemberAttrs>
}

export type OrganizationDocument = HydratedDocument<OrganizationAttrs>

const organizationSchema = new Schema<OrganizationAttrs>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [organizationMemberSchema],
  },
  { timestamps: true }
)

organizationSchema.index({ slug: 1 }, { unique: true })
organizationSchema.index({ 'members.user': 1 })

organizationSchema.set('toJSON', { transform: idTransform })

export const Organization = mongoose.model('Organization', organizationSchema)

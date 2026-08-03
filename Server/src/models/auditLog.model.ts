import mongoose, { HydratedDocument, Schema, Types } from 'mongoose'
import { idTransform } from '../utils/mongoTransform'

export interface AuditLogAttrs {
  actor: Types.ObjectId
  action: string
  targetType: string
  targetId: Types.ObjectId
  metadata?: Record<string, unknown>
  // Unset for platform-level admin-console actions; set for organization-scoped actions — see
  // admin.controller.ts's audit-log endpoint, which defaults to platform-only entries so an
  // admin browsing the undifferentiated view never sees another tenant's activity by accident.
  organization?: Types.ObjectId
  createdAt: Date
}

export type AuditLogDocument = HydratedDocument<AuditLogAttrs>

const auditLogSchema = new Schema<AuditLogAttrs>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    targetType: { type: String, required: true, trim: true, maxlength: 60 },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

auditLogSchema.index({ organization: 1, createdAt: -1 })
auditLogSchema.index({ actor: 1, createdAt: -1 })

auditLogSchema.set('toJSON', { transform: idTransform })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)

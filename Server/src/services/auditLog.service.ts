import { Types } from 'mongoose'
import { AuditLog, AuditLogDocument } from '../models/auditLog.model'

export interface RecordAuditEventInput {
  actor: Types.ObjectId | string
  action: string
  targetType: string
  targetId: Types.ObjectId | string
  metadata?: Record<string, unknown>
  organization?: Types.ObjectId | string
}

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<AuditLogDocument> {
  return AuditLog.create(input)
}

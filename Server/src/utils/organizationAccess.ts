import { Types } from 'mongoose'
import { OrganizationDocument, OrganizationMemberRole } from '../models/organization.model'
import { AppError } from './AppError'

export function getMembership(org: OrganizationDocument, userId: Types.ObjectId | string) {
  return org.members.find((member) => member.user.toString() === userId.toString())
}

// Mirrors utils/courseAccess.ts#assertCourseRole, including the global-admin bypass — so the
// admin console can inspect/manage any organization without needing a membership row.
export function assertOrgRole(
  org: OrganizationDocument,
  userId: Types.ObjectId | string,
  globalRole: string,
  allowed: OrganizationMemberRole[]
): void {
  if (globalRole === 'admin') return

  const membership = getMembership(org, userId)
  if (!membership || !allowed.includes(membership.role)) {
    throw new AppError(403, 'You do not have permission to perform this action on this organization')
  }
}

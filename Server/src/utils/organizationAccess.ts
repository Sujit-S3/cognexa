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

const ORG_ROLE_RANK: Record<OrganizationMemberRole, number> = { member: 0, admin: 1, owner: 2 }

export function orgRoleRank(role: OrganizationMemberRole): number {
  return ORG_ROLE_RANK[role]
}

// assertOrgRole treats 'owner' and 'admin' as equally privileged for *reaching* a mutation
// (both pass the ['owner','admin'] gate), but that alone lets an 'admin' escalate themselves to
// 'owner' or remove/demote the real owner. Call this after assertOrgRole for any mutation that
// grants a role or targets an existing member, to enforce that an actor can never grant a role
// ranked above their own, nor touch (role-change or remove) a member ranked above their own.
// Global admins (globalRole === 'admin') bypass this the same way they bypass assertOrgRole.
export function assertOrgRoleHierarchy(
  org: OrganizationDocument,
  userId: Types.ObjectId | string,
  globalRole: string,
  check: { grantedRole?: OrganizationMemberRole; targetCurrentRole?: OrganizationMemberRole }
): void {
  if (globalRole === 'admin') return

  const actorMembership = getMembership(org, userId)
  const actorRank = actorMembership ? orgRoleRank(actorMembership.role) : -1

  if (check.grantedRole !== undefined && orgRoleRank(check.grantedRole) > actorRank) {
    throw new AppError(403, 'You cannot grant a role higher than your own')
  }
  if (check.targetCurrentRole !== undefined && orgRoleRank(check.targetCurrentRole) > actorRank) {
    throw new AppError(403, 'You cannot change or remove a member whose role is higher than your own')
  }
}

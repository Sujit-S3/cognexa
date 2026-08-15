import { describe, expect, it } from 'vitest'
import { Organization } from '../models/organization.model'
import { assertOrgRole, assertOrgRoleHierarchy, getMembership } from '../utils/organizationAccess'

const ownerId = '507f1f77bcf86cd799439011'
const memberId = '507f1f77bcf86cd799439022'
const outsiderId = '507f1f77bcf86cd799439033'
const secondOwnerId = '507f1f77bcf86cd799439044'
const adminMemberId = '507f1f77bcf86cd799439055'

function buildOrg() {
  return new Organization({
    name: 'Acme University',
    slug: 'acme-university',
    createdBy: ownerId,
    members: [
      { user: ownerId, role: 'owner' },
      { user: memberId, role: 'member' },
    ],
  })
}

function buildOrgWithTwoOwners() {
  return new Organization({
    name: 'Acme University',
    slug: 'acme-university',
    createdBy: ownerId,
    members: [
      { user: ownerId, role: 'owner' },
      { user: secondOwnerId, role: 'owner' },
      { user: adminMemberId, role: 'admin' },
    ],
  })
}

describe('organization access', () => {
  it('allows an owner to perform an owner/admin-gated action', () => {
    const org = buildOrg()
    expect(() => assertOrgRole(org, ownerId, 'instructor', ['owner', 'admin'])).not.toThrow()
  })

  it('rejects a plain member from an owner/admin-gated action', () => {
    const org = buildOrg()
    expect(() => assertOrgRole(org, memberId, 'student', ['owner', 'admin'])).toThrow(
      'You do not have permission'
    )
  })

  it('rejects a non-member entirely, even for a member-level action', () => {
    const org = buildOrg()
    expect(() => assertOrgRole(org, outsiderId, 'student', ['owner', 'admin', 'member'])).toThrow(
      'You do not have permission'
    )
  })

  it('lets a global admin bypass organization membership entirely', () => {
    const org = buildOrg()
    expect(() => assertOrgRole(org, outsiderId, 'admin', ['owner'])).not.toThrow()
  })

  it('getMembership returns undefined for a non-member', () => {
    const org = buildOrg()
    expect(getMembership(org, outsiderId)).toBeUndefined()
    expect(getMembership(org, memberId)?.role).toBe('member')
  })
})

describe('assertOrgRoleHierarchy', () => {
  it('rejects an admin granting a role higher than their own', () => {
    const org = buildOrgWithTwoOwners()
    expect(() => assertOrgRoleHierarchy(org, adminMemberId, 'student', { grantedRole: 'owner' })).toThrow(
      'You cannot grant a role higher than your own'
    )
  })

  it('rejects an admin touching a member ranked above their own', () => {
    const org = buildOrgWithTwoOwners()
    expect(() =>
      assertOrgRoleHierarchy(org, adminMemberId, 'student', { targetCurrentRole: 'owner' })
    ).toThrow('You cannot change or remove a member whose role is higher than your own')
  })

  it('blocks the sole owner from demoting themselves, orphaning the organization', () => {
    const org = buildOrg()
    expect(() =>
      assertOrgRoleHierarchy(org, ownerId, 'instructor', {
        targetCurrentRole: 'owner',
        grantedRole: 'member',
      })
    ).toThrow('An organization must have at least one owner')
  })

  it('blocks the sole owner from removing themselves', () => {
    const org = buildOrg()
    expect(() => assertOrgRoleHierarchy(org, ownerId, 'instructor', { targetCurrentRole: 'owner' })).toThrow(
      'An organization must have at least one owner'
    )
  })

  it('allows demoting one of two owners, since an owner remains', () => {
    const org = buildOrgWithTwoOwners()
    expect(() =>
      assertOrgRoleHierarchy(org, secondOwnerId, 'instructor', {
        targetCurrentRole: 'owner',
        grantedRole: 'member',
      })
    ).not.toThrow()
  })

  it('allows promoting another owner without triggering the last-owner guard', () => {
    const org = buildOrg()
    expect(() =>
      assertOrgRoleHierarchy(org, ownerId, 'instructor', {
        targetCurrentRole: 'member',
        grantedRole: 'owner',
      })
    ).not.toThrow()
  })

  it('lets a global admin bypass the last-owner guard for platform-level cleanup', () => {
    const org = buildOrg()
    expect(() =>
      assertOrgRoleHierarchy(org, outsiderId, 'admin', { targetCurrentRole: 'owner', grantedRole: 'member' })
    ).not.toThrow()
  })
})

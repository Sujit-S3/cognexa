import { describe, expect, it } from 'vitest'
import { Organization } from '../models/organization.model'
import { assertOrgRole, getMembership } from '../utils/organizationAccess'

const ownerId = '507f1f77bcf86cd799439011'
const memberId = '507f1f77bcf86cd799439022'
const outsiderId = '507f1f77bcf86cd799439033'

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

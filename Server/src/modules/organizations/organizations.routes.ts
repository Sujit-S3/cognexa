import { Router } from 'express'
import { authenticate, optionalAuthenticate } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import * as organizations from './organizations.controller'
import {
  acceptInvitationSchema,
  assignLearningSchema,
  createOrganizationSchema,
  inviteMemberSchema,
  invitationParamsSchema,
  memberParamsSchema,
  orgIdParamsSchema,
  tokenParamsSchema,
  updateMemberRoleSchema,
} from './organizations.validation'

export const organizationsRouter = Router()
export const invitationsRouter = Router()

organizationsRouter.use(authenticate)

organizationsRouter.post('/', validate({ body: createOrganizationSchema }), organizations.createOrganization)
organizationsRouter.get('/mine', organizations.listMyOrganizations)
organizationsRouter.get('/:orgId', validate({ params: orgIdParamsSchema }), organizations.getOrganization)
organizationsRouter.get(
  '/:orgId/audit-log',
  validate({ params: orgIdParamsSchema }),
  organizations.getOrganizationAuditLog
)
organizationsRouter.get(
  '/:orgId/progress',
  validate({ params: orgIdParamsSchema }),
  organizations.getMembersProgress
)
organizationsRouter.post(
  '/:orgId/assign-learning',
  validate({ params: orgIdParamsSchema, body: assignLearningSchema }),
  organizations.assignLearning
)
organizationsRouter.get(
  '/:orgId/invitations',
  validate({ params: orgIdParamsSchema }),
  organizations.listInvitations
)
organizationsRouter.post(
  '/:orgId/invitations',
  validate({ params: orgIdParamsSchema, body: inviteMemberSchema }),
  organizations.inviteMember
)
organizationsRouter.post(
  '/:orgId/invitations/:invitationId/revoke',
  validate({ params: invitationParamsSchema }),
  organizations.revokeInvitation
)
organizationsRouter.patch(
  '/:orgId/members/:userId',
  validate({ params: memberParamsSchema, body: updateMemberRoleSchema }),
  organizations.updateMemberRole
)
organizationsRouter.delete(
  '/:orgId/members/:userId',
  validate({ params: memberParamsSchema }),
  organizations.removeMember
)

// Accept-by-token isn't nested under an org id — same shape as /auth/reset/:token. The preview
// (getInvitationByToken) works signed-out so an invitee can see what they're accepting before
// creating an account or logging in.
invitationsRouter.get(
  '/:token',
  optionalAuthenticate,
  validate({ params: tokenParamsSchema }),
  organizations.getInvitationByToken
)
invitationsRouter.post(
  '/:token/accept',
  authenticate,
  validate({ params: tokenParamsSchema, body: acceptInvitationSchema }),
  organizations.acceptInvitation
)

import type { Connection } from 'mongoose'
import { Achievement } from '../models/achievement.model'
import { Assessment } from '../models/assessment.model'
import { AssessmentSubmission } from '../models/assessmentSubmission.model'
import { AuditLog } from '../models/auditLog.model'
import { Course } from '../models/course.model'
import { GradesSummary } from '../models/gradesSummary.model'
import { Invitation } from '../models/invitation.model'
import { LectureComments } from '../models/lectureComments.model'
import { Notification } from '../models/notification.model'
import { Organization } from '../models/organization.model'
import { Session } from '../models/session.model'
import { Submission } from '../models/submission.model'
import { User } from '../models/user.model'

export interface Migration {
  id: string
  description: string
  up: (connection: Connection) => Promise<void>
  down?: (connection: Connection) => Promise<void>
}

export const migrations: Migration[] = [
  {
    id: '202607210001-ensure-critical-indexes',
    description: 'Create the user, session, and course indexes declared by the supported models.',
    async up() {
      // createIndexes is additive: it does not drop an existing index during a rolling release.
      await Promise.all([User.createIndexes(), Session.createIndexes(), Course.createIndexes()])
    },
  },
  {
    id: '202607270001-index-operational-queries',
    description: 'Create indexes for deadline, instructor dashboard, recovery, comment, and grade queries.',
    async up() {
      await Promise.all([
        Achievement.createIndexes(),
        Assessment.createIndexes(),
        GradesSummary.createIndexes(),
        LectureComments.createIndexes(),
        Submission.createIndexes(),
        User.createIndexes(),
      ])
    },
  },
  {
    id: '202607310001-notification-indexes',
    description: 'Create indexes for the in-app notification collection.',
    async up() {
      await Notification.createIndexes()
    },
  },
  {
    id: '202607310002-assessment-submission-indexes',
    description:
      'Create indexes for learner assessment submissions, including the partial unique index enforcing one in-progress attempt per learner per assessment.',
    async up() {
      await AssessmentSubmission.createIndexes()
    },
  },
  {
    id: '202607310003-achievement-certificate-index',
    description: 'Create the unique index on Achievement.certificate for public verification lookups.',
    async up() {
      await Achievement.createIndexes()
    },
  },
  {
    id: '202608020001-audit-log-indexes',
    description: 'Create indexes for the admin console and organization audit log collection.',
    async up() {
      await AuditLog.createIndexes()
    },
  },
  {
    id: '202608020002-organization-tenancy-indexes',
    description:
      'Create indexes for organizations and invitations, and the new User.organizations reverse pointer.',
    async up() {
      await Promise.all([Organization.createIndexes(), Invitation.createIndexes(), User.createIndexes()])
    },
  },
  {
    id: '202608030001-lecture-comments-unique-thread',
    description:
      'Create the unique index on LectureComments.moduleItemId (replacing the old non-unique compound index), so concurrent first-comments on the same lesson cannot create two separate comment threads.',
    async up() {
      await LectureComments.createIndexes()
    },
  },
]

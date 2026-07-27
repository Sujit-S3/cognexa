import type { Connection } from 'mongoose'
import { Achievement } from '../models/achievement.model'
import { Assessment } from '../models/assessment.model'
import { Course } from '../models/course.model'
import { GradesSummary } from '../models/gradesSummary.model'
import { LectureComments } from '../models/lectureComments.model'
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
]

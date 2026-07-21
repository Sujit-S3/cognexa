import type { Connection } from 'mongoose'
import { Course } from '../models/course.model'
import { Session } from '../models/session.model'
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
]

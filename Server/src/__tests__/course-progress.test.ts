import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'
import { Course, EnrollmentAttrs } from '../models/course.model'
import { clearTestDb, connectTestDb, disconnectTestDb } from './testDb'

function buildCourseInput() {
  return {
    name: 'Systems Thinking',
    createdBy: new Types.ObjectId(),
    modules: [
      {
        title: 'Module 1',
        order: 0,
        moduleItems: [
          { title: 'Item 1', type: 'video', order: 0, isPreview: false },
          { title: 'Item 2', type: 'pdf', order: 1, isPreview: false },
        ],
      },
      {
        title: 'Module 2',
        order: 1,
        moduleItems: [{ title: 'Item 3', type: 'markdown', order: 0, isPreview: false }],
      },
    ],
  }
}

describe('course progress (pure)', () => {
  it('finds a module item nested under any module', () => {
    const course = new Course(buildCourseInput())
    const itemId = course.modules[1]!.moduleItems[0]!._id
    expect(course.getModuleItem(itemId)?.title).toBe('Item 3')
    expect(course.getModuleItem(new Types.ObjectId())).toBeNull()
  })

  it('returns null progress for a user with no enrollment', () => {
    expect(new Course(buildCourseInput()).computeProgress(new Types.ObjectId())).toBeNull()
  })

  it('computes percent from the enrollment completedItems, not the client', () => {
    const course = new Course(buildCourseInput())
    const userId = new Types.ObjectId()
    const firstItemId = course.modules[0]!.moduleItems[0]!._id
    course.enrollments.push({
      user: userId,
      enrolledAs: 'student',
      completedItems: [firstItemId],
    } as unknown as EnrollmentAttrs)

    expect(course.computeProgress(userId)).toMatchObject({ completedCount: 1, totalCount: 3, percent: 33 })
  })

  it('ignores completedItems that no longer resolve to a real module item', () => {
    const course = new Course(buildCourseInput())
    const userId = new Types.ObjectId()
    course.enrollments.push({
      user: userId,
      enrolledAs: 'student',
      completedItems: [new Types.ObjectId()],
    } as unknown as EnrollmentAttrs)

    expect(course.computeProgress(userId)).toMatchObject({ completedCount: 0, totalCount: 3, percent: 0 })
  })
})

describe('course progress ($addToSet idempotency, memory-server)', () => {
  beforeAll(connectTestDb)
  afterEach(clearTestDb)
  afterAll(disconnectTestDb)

  it('marking the same item complete twice never duplicates or regresses progress', async () => {
    const userId = new Types.ObjectId()
    const created = await Course.create(buildCourseInput())
    created.enrollments.push({
      user: userId,
      enrolledAs: 'student',
      completedItems: [],
    } as unknown as EnrollmentAttrs)
    await created.save()

    const itemId = created.modules[0]!.moduleItems[0]!._id
    const markComplete = () =>
      Course.updateOne(
        { _id: created._id, 'enrollments.user': userId },
        { $addToSet: { 'enrollments.$.completedItems': itemId } }
      )

    await Promise.all([markComplete(), markComplete()])

    const reloaded = await Course.findById(created._id).orFail()
    expect(reloaded.computeProgress(userId)).toMatchObject({ completedCount: 1, totalCount: 3 })
  })
})

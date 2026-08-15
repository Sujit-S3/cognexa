import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Types } from 'mongoose'

// user.model.ts imports config/env.ts directly — env vars must exist before that first import,
// so set them and defer the imports under test (Pattern B).
process.env.MONGODB_ATLAS_URI ??= 'mongodb://localhost:27017/cognexa-test'
process.env.SECRET_KEY ??= 'test-secret-key-that-is-at-least-32-characters-long'
process.env.NODE_ENV = 'test'

let User: typeof import('../models/user.model').User
let Course: typeof import('../models/course.model').Course
let Achievement: typeof import('../models/achievement.model').Achievement
let certificates: typeof import('../modules/certificates/certificates.controller')
let invokeMiddleware: typeof import('./testHttp').invokeMiddleware
let mockReq: typeof import('./testHttp').mockReq
let connectTestDb: typeof import('./testDb').connectTestDb
let disconnectTestDb: typeof import('./testDb').disconnectTestDb
let clearTestDb: typeof import('./testDb').clearTestDb

beforeAll(async () => {
  ;({ User } = await import('../models/user.model'))
  ;({ Course } = await import('../models/course.model'))
  ;({ Achievement } = await import('../models/achievement.model'))
  certificates = await import('../modules/certificates/certificates.controller')
  ;({ invokeMiddleware, mockReq } = await import('./testHttp'))
  ;({ connectTestDb, disconnectTestDb, clearTestDb } = await import('./testDb'))
  await connectTestDb()
})

afterEach(async () => {
  await clearTestDb()
})

afterAll(async () => {
  await disconnectTestDb()
})

async function createLearner() {
  const suffix = new Types.ObjectId().toString()
  return User.create({
    username: `learner-${suffix}`,
    name: 'Nora Learner',
    email: `learner-${suffix}@example.com`,
    password: 'correct horse battery staple',
    mobile: '555-010-1234',
    role: 'student',
  })
}

async function createCourse() {
  return Course.create({ name: 'Systems Thinking', createdBy: new Types.ObjectId(), status: 'published' })
}

async function createAchievement(userId: Types.ObjectId, courseId: Types.ObjectId) {
  return Achievement.create({
    user: userId,
    course: courseId,
    score: '95%',
    gradeLetter: 'A',
    finishedAt: new Date('2026-01-01'),
    certificate: 'CGX-TEST-000001',
  })
}

describe('verifyCertificate', () => {
  it('returns the certificate details for a valid code', async () => {
    const learner = await createLearner()
    const course = await createCourse()
    await createAchievement(learner._id, course._id)

    const { body } = await invokeMiddleware<{ valid: boolean; learnerName: string; courseName: string }>(
      certificates.verifyCertificate,
      mockReq({ params: { code: 'CGX-TEST-000001' } })
    )
    expect(body).toMatchObject({ valid: true, learnerName: 'Nora Learner', courseName: 'Systems Thinking' })
  })

  it('returns valid:false for an unknown code instead of a 500', async () => {
    const { res } = await invokeMiddleware(
      certificates.verifyCertificate,
      mockReq({ params: { code: 'CGX-DOES-NOTEXIST' } })
    )
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ valid: false })
  })

  it('falls back to a placeholder name instead of crashing when the learner account was deleted', async () => {
    const course = await createCourse()
    await createAchievement(new Types.ObjectId(), course._id)

    const { body } = await invokeMiddleware<{ valid: boolean; learnerName: string }>(
      certificates.verifyCertificate,
      mockReq({ params: { code: 'CGX-TEST-000001' } })
    )
    expect(body.valid).toBe(true)
    expect(body.learnerName).toBe('Former learner')
  })

  it('falls back to a placeholder name instead of crashing when the course was deleted', async () => {
    const learner = await createLearner()
    await createAchievement(learner._id, new Types.ObjectId())

    const { body } = await invokeMiddleware<{ valid: boolean; courseName: string }>(
      certificates.verifyCertificate,
      mockReq({ params: { code: 'CGX-TEST-000001' } })
    )
    expect(body.valid).toBe(true)
    expect(body.courseName).toBe('Deleted course')
  })
})

describe('downloadCertificatePdf', () => {
  it('streams a PDF to the owning learner', async () => {
    const learner = await createLearner()
    const course = await createCourse()
    const achievement = await createAchievement(learner._id, course._id)

    const { res } = await invokeMiddleware(
      certificates.downloadCertificatePdf,
      mockReq({
        params: { achievementId: achievement._id.toString() },
        user: { _id: learner._id, role: learner.role },
      })
    )
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'content-type': 'application/pdf' }))
  })

  it('rejects a learner who does not own the certificate', async () => {
    const owner = await createLearner()
    const intruder = await createLearner()
    const course = await createCourse()
    const achievement = await createAchievement(owner._id, course._id)

    const { next } = await invokeMiddleware(
      certificates.downloadCertificatePdf,
      mockReq({
        params: { achievementId: achievement._id.toString() },
        user: { _id: intruder._id, role: intruder.role },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })

  it('lets an admin download even when the owning learner account was since deleted', async () => {
    const admin = await createLearner()
    admin.role = 'admin'
    await admin.save()
    const course = await createCourse()
    const achievement = await createAchievement(new Types.ObjectId(), course._id)

    const { res } = await invokeMiddleware(
      certificates.downloadCertificatePdf,
      mockReq({
        params: { achievementId: achievement._id.toString() },
        user: { _id: admin._id, role: 'admin' },
      })
    )
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'content-type': 'application/pdf' }))
  })

  it('rejects a non-admin, non-owner when the owning learner account was since deleted', async () => {
    const intruder = await createLearner()
    const course = await createCourse()
    const achievement = await createAchievement(new Types.ObjectId(), course._id)

    const { next } = await invokeMiddleware(
      certificates.downloadCertificatePdf,
      mockReq({
        params: { achievementId: achievement._id.toString() },
        user: { _id: intruder._id, role: intruder.role },
      })
    )
    expect(next.mock.calls[0]![0]).toMatchObject({ statusCode: 403 })
  })
})

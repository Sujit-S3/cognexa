import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { Achievement } from '../../models/achievement.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { AppError } from '../../utils/AppError'
import { renderCertificatePdf } from '../../services/certificate.service'

export const getMyAchievements = asyncHandler(async (req: Request, res: Response) => {
  const achievements = await Achievement.find({ user: req.user!._id })
    .populate('course', 'name')
    .sort({ finishedAt: -1 })
  res.json(achievements)
})

export const downloadCertificatePdf = asyncHandler(async (req: Request, res: Response) => {
  const { achievementId } = req.params
  if (!achievementId) throw new AppError(400, 'Missing certificate id')

  const achievement = await Achievement.findById(achievementId)
    .populate('user', 'name')
    .populate('course', 'name')
    .orFail(() => new AppError(404, 'Certificate not found'))

  // populate() resolves to null (not a throw) if the learner or course was since deleted — a
  // certificate must stay downloadable indefinitely (see verifyCertificate's rationale), so a
  // deleted referenced document degrades to a fallback label instead of a 500. A deleted-user
  // certificate can only still be downloaded by an admin, since there's no learner left to own it.
  const learner = achievement.user as unknown as { _id: Types.ObjectId; name: string } | null
  const isOwner = learner != null && learner._id.toString() === req.user!._id.toString()
  if (!isOwner && req.user!.role !== 'admin') {
    throw new AppError(403, 'You cannot download this certificate')
  }

  const course = achievement.course as unknown as { name: string } | null

  res.set({
    'content-type': 'application/pdf',
    'content-disposition': `inline; filename="certificate-${achievement._id}.pdf"`,
    'cache-control': 'private, no-store',
  })

  renderCertificatePdf({
    learnerName: learner?.name ?? 'Former learner',
    courseName: course?.name ?? 'Deleted course',
    gradeLetter: achievement.gradeLetter,
    finishedAt: achievement.finishedAt,
    verificationCode: achievement.certificate ?? '',
  }).pipe(res)
})

// Public, unauthenticated — a certificate's completion claim is meant to be verifiable by anyone
// holding the code, the same way a paper certificate's authenticity can be checked.
export const verifyCertificate = asyncHandler(async (req: Request, res: Response) => {
  const achievement = await Achievement.findOne({ certificate: req.params.code })
    .populate('user', 'name')
    .populate('course', 'name')

  if (!achievement) {
    res.status(404).json({ valid: false })
    return
  }

  // populate() resolves to null (not a throw) if the learner or course was since deleted — this
  // endpoint's whole point is staying verifiable indefinitely, so degrade to a fallback label
  // instead of a 500 for the same reason as downloadCertificatePdf above.
  const learner = achievement.user as unknown as { name: string } | null
  const course = achievement.course as unknown as { name: string } | null

  res.json({
    valid: true,
    learnerName: learner?.name ?? 'Former learner',
    courseName: course?.name ?? 'Deleted course',
    gradeLetter: achievement.gradeLetter,
    score: achievement.score,
    finishedAt: achievement.finishedAt,
  })
})

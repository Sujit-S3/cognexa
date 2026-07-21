import type { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { aiService } from '../../services/ai'

export const completeTutor = asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.completeTutor(req.body)
  res.set('cache-control', 'no-store').json(result)
})

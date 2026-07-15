import { NextFunction, Request, Response } from 'express'
import { ZodTypeAny } from 'zod'

interface ValidationSchemas {
  // ZodTypeAny (not AnyZodObject) so schemas using .refine()/.transform() — which produce
  // ZodEffects, not ZodObject — are accepted (e.g. the register schema's password-match refine).
  body?: ZodTypeAny
  params?: ZodTypeAny
  query?: ZodTypeAny
}

// Parses+replaces req.body/params/query with the schema output so controllers get trusted, typed input.
export const validate =
  (schemas: ValidationSchemas) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params
      if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query
      next()
    } catch (err) {
      next(err)
    }
  }

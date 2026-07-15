import { Request } from 'express'
import { AppError } from './AppError'

// With `noUncheckedIndexedAccess`, req.params.<name> is typed `string | undefined` even though a
// matched route guarantees the segment exists. This narrows it to `string` and fails loudly (400)
// in the impossible-but-type-safe case where it's missing, instead of forcing a non-null assertion
// at every call site.
export function requireParam(req: Request, name: string): string {
  const value = req.params[name]
  if (value === undefined) throw new AppError(400, `Missing required route parameter: ${name}`)
  return value
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared Mongoose toJSON/toObject transforms. Centralised so every model strips Mongo internals
// the same way. Params are typed `any` because Mongoose types the transform's `ret` as the
// concrete document shape (no index signature), which a `Record<string, unknown>` param cannot
// satisfy contravariantly — `any` is the idiomatic escape hatch for reusable transforms.

// Maps `_id` -> `id` (string) and drops `_id`/`__v`. Use for documents the client references by id.
export function idTransform(_doc: any, ret: any): any {
  if (ret._id != null) ret.id = String(ret._id)
  delete ret._id
  delete ret.__v
  return ret
}

// Drops `_id`/`__v` without exposing an `id` field. Use for embedded/aggregate-style documents.
export function stripInternalTransform(_doc: any, ret: any): any {
  delete ret._id
  delete ret.__v
  return ret
}

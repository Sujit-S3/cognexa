export function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 11000
  )
}

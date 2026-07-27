import { describe, expect, it } from 'vitest'
import {
  registerSchema,
  resetTokenParamsSchema,
  sessionIdParamsSchema,
  updateUserSchema,
} from '../modules/auth/auth.validation'

const validRegistration = {
  username: 'learner',
  name: 'Learner',
  email: 'learner@example.com',
  mobile: '555-555-0100',
  password: 'Correct-Horse-42',
  passwordConfirm: 'Correct-Horse-42',
}

describe('authentication input validation', () => {
  it('requires the complete phone value to match the supported format', () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true)
    expect(
      registerSchema.safeParse({ ...validRegistration, mobile: 'prefix-555-555-0100-suffix' }).success
    ).toBe(false)
  })

  it('applies password policy to profile password changes', () => {
    expect(updateUserSchema.safeParse({ password: 'contains-password-value' }).success).toBe(false)
    expect(updateUserSchema.safeParse({ password: 'Safer-credential-42' }).success).toBe(true)
  })

  it('bounds session and password-reset route identifiers', () => {
    expect(() => sessionIdParamsSchema.parse({ sessionId: 'invalid' })).toThrow()
    expect(() => resetTokenParamsSchema.parse({ token: 'a'.repeat(63) })).toThrow()
    expect(resetTokenParamsSchema.parse({ token: 'a'.repeat(64) })).toEqual({
      token: 'a'.repeat(64),
    })
  })
})

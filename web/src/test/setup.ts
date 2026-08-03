import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterEach, expect } from 'vitest'

expect.extend(matchers)

// vitest.config.ts doesn't set `test.globals`, so @testing-library/react's own auto-cleanup
// (which only registers when it detects a global afterEach) never engages — without this, DOM
// from an earlier test in the same file stays mounted and leaks into later queries/assertions.
afterEach(cleanup)

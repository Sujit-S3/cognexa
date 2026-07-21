import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from './AppErrorBoundary'

function BrokenView(): never {
  throw new Error('render failed')
}

describe('AppErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('replaces a crashed route with a recoverable alert', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>
    )

    expect(screen.getByRole('alert').textContent).toContain('We hit a learning detour')
    expect(screen.getByRole('button', { name: 'Reload application' }).hasAttribute('disabled')).toBe(false)
  })
})

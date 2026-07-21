import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BrandLogo } from './BrandLogo'

describe('BrandLogo', () => {
  it('renders the official Cognexa wordmark', () => {
    const { container } = render(<BrandLogo />)

    expect(screen.getByText('Cognexa')).toBeTruthy()
    expect(container.querySelector('[aria-label="Cognexa"]')).not.toBeNull()
  })

  it('keeps an accessible name in compact navigation', () => {
    const { container } = render(<BrandLogo compact />)

    expect(container.textContent).toBe('C')
    expect(container.querySelector('[aria-label="Cognexa"]')).not.toBeNull()
  })
})

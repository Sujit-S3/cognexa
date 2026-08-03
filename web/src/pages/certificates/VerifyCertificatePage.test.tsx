import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CertificateVerificationView } from '../../services/api'

const mocks = vi.hoisted(() => ({ verify: vi.fn() }))

vi.mock('../../services/api', () => ({
  certificatesApi: { verify: mocks.verify },
}))

import { VerifyCertificatePage } from './VerifyCertificatePage'

function renderPage(code: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/certificates/verify/${code}`]}>
        <Routes>
          <Route path="/certificates/verify/:code" element={<VerifyCertificatePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VerifyCertificatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows certificate details for a valid code', async () => {
    const response: CertificateVerificationView = {
      valid: true,
      learnerName: 'Nora Learner',
      courseName: 'Systems Thinking',
      gradeLetter: 'A',
      score: '95%',
      finishedAt: new Date('2026-01-15').toISOString(),
    }
    mocks.verify.mockResolvedValue(response)

    renderPage('CGX-VALID-CODE1')

    expect(await screen.findByText('Valid certificate')).toBeInTheDocument()
    expect(screen.getByText('Nora Learner')).toBeInTheDocument()
    expect(screen.getByText('Systems Thinking')).toBeInTheDocument()
    expect(mocks.verify).toHaveBeenCalledWith('CGX-VALID-CODE1')
  })

  it('shows a not-found message for an invalid code', async () => {
    mocks.verify.mockResolvedValue({ valid: false })

    renderPage('CGX-BOGUS-CODE1')

    expect(await screen.findByText('No certificate found for this code')).toBeInTheDocument()
  })
})

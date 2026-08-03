import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { OrganizationView } from '../../services/api'

const mocks = vi.hoisted(() => ({
  listMine: vi.fn(),
  create: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  organizationsApi: {
    listMine: mocks.listMine,
    create: mocks.create,
  },
}))

import { OrganizationsListPage } from './OrganizationsListPage'

const org: OrganizationView = {
  id: 'org-1',
  name: 'Acme University',
  slug: 'acme-university',
  createdBy: 'user-1',
  members: [
    {
      id: 'm-1',
      role: 'owner',
      joinedAt: new Date().toISOString(),
      user: { id: 'user-1', name: 'Owner', email: 'owner@example.com', photo: '' },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrganizationsListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OrganizationsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state with no organizations', async () => {
    mocks.listMine.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('No organizations yet')).toBeInTheDocument()
  })

  it("lists the caller's organizations", async () => {
    mocks.listMine.mockResolvedValue([org])
    renderPage()
    expect(await screen.findByText('Acme University')).toBeInTheDocument()
  })

  it('creates a new organization', async () => {
    mocks.listMine.mockResolvedValue([])
    mocks.create.mockResolvedValue(org)
    renderPage()

    await screen.findByText('No organizations yet')
    fireEvent.change(screen.getByLabelText('New organization name'), { target: { value: 'Acme University' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create organization' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('Acme University'))
  })
})

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CourseView, ModuleItemDetailView } from '../../services/api'

const mocks = vi.hoisted(() => ({
  getCourse: vi.fn(),
  getItem: vi.fn(),
  markComplete: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  coursesApi: { getOne: mocks.getCourse },
  lecturesApi: { getOne: mocks.getItem, markComplete: mocks.markComplete },
}))

import { CourseLearnPage } from './CourseLearnPage'

const baseCourse: CourseView = {
  name: 'Systems Thinking',
  status: 'published',
  enrolled: true,
  progress: { completedCount: 0, totalCount: 1, percent: 0, completedItems: [] },
  modules: [
    {
      title: 'Module 1',
      moduleItems: [{ _id: 'item-1', title: 'Welcome', type: 'markdown' }],
    },
  ],
}

function renderPage(item: ModuleItemDetailView, course: CourseView = baseCourse) {
  mocks.getCourse.mockResolvedValue(course)
  mocks.getItem.mockResolvedValue(item)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/courses/course-1/learn/item-1']}>
        <Routes>
          <Route path="/courses/:courseId/learn/:itemId" element={<CourseLearnPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CourseLearnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders markdown lesson content with HTML escaped before markdown is applied', async () => {
    renderPage({
      _id: 'item-1',
      title: 'Welcome',
      type: 'markdown',
      content: '**bold** <script>alert(1)</script>',
      completed: false,
    })

    expect(await screen.findByRole('heading', { name: 'Welcome' })).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(
      screen.getByText((_, node) => node?.tagName === 'STRONG' && node.textContent === 'bold')
    ).toBeTruthy()
  })

  it('sanitizes rich_text content and strips scripts before rendering', async () => {
    renderPage({
      _id: 'item-1',
      title: 'Welcome',
      type: 'rich_text',
      content: '<p>hello</p><script>alert(1)</script><img src=x onerror="alert(1)">',
      completed: false,
    })

    await screen.findByRole('heading', { name: 'Welcome' })
    expect(document.querySelector('script')).toBeNull()
    expect(document.querySelector('img[onerror]')).toBeNull()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('marks an item complete and disables the button once done', async () => {
    mocks.markComplete.mockResolvedValue({
      completedCount: 1,
      totalCount: 1,
      percent: 100,
      completedItems: [],
    })
    renderPage({ _id: 'item-1', title: 'Welcome', type: 'markdown', content: 'hi', completed: false })

    const button = await screen.findByRole('button', { name: 'Mark complete' })
    fireEvent.click(button)

    await waitFor(() => expect(mocks.markComplete).toHaveBeenCalledWith('course-1', 'item-1'))
  })

  it('shows a completed state and does not allow re-completing', async () => {
    renderPage({ _id: 'item-1', title: 'Welcome', type: 'markdown', content: 'hi', completed: true })

    const button = await screen.findByRole('button', { name: 'Completed' })
    expect(button).toBeDisabled()
  })

  it('rejects a javascript: url instead of rendering it as a link', async () => {
    renderPage({
      _id: 'item-1',
      title: 'Welcome',
      type: 'external_url',
      // eslint-disable-next-line no-script-url
      url: 'javascript:alert(1)',
      completed: false,
    })

    await screen.findByRole('heading', { name: 'Welcome' })
    expect(screen.queryByRole('link', { name: /Open external resource/ })).toBeNull()
    expect(screen.getByText('No content has been added to this lesson yet.')).toBeInTheDocument()
  })

  it('shows an error state when the lesson cannot be loaded', async () => {
    mocks.getCourse.mockResolvedValue(baseCourse)
    mocks.getItem.mockRejectedValue(new Error('not found'))

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/courses/course-1/learn/item-1']}>
          <Routes>
            <Route path="/courses/:courseId/learn/:itemId" element={<CourseLearnPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(await screen.findByText('Lesson unavailable')).toBeInTheDocument()
  })
})

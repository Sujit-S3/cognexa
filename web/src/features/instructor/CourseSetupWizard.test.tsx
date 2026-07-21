import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CourseWorkspace } from '../../services/api'
import { CourseSetupWizard } from './CourseSetupWizard'

const course: CourseWorkspace = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Untitled course',
  description: '',
  tags: [],
  language: 'English',
  level: 'all-levels',
  prerequisites: [],
  pricing: { model: 'free', amount: 0, currency: 'USD' },
  seo: {},
  modules: [],
  assessments: [],
  status: 'draft',
  draftVersion: 1,
}

describe('CourseSetupWizard', () => {
  it('blocks progression and announces incomplete step validation', async () => {
    render(<CourseSetupWizard course={course} courseId={course._id!} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert').textContent).toContain('Use at least 40 characters')
    expect(screen.getByRole('heading', { name: 'Course basics' })).toBeTruthy()
  })
})

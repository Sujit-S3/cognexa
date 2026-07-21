import { beforeEach, describe, expect, it } from 'vitest'
import type { CourseWorkspace } from '../../services/api'
import { useCourseBuilderStore } from './courseBuilderStore'

const workspace: CourseWorkspace = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Course draft',
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

describe('courseBuilderStore', () => {
  beforeEach(() => useCourseBuilderStore.getState().reset())

  it('tracks local edits and accepts the matching server revision', () => {
    const store = useCourseBuilderStore.getState()
    store.initialize(workspace)
    store.updateCourse((course) => ({ ...course, name: 'Updated title' }))

    expect(useCourseBuilderStore.getState()).toMatchObject({ localRevision: 1, saveStatus: 'dirty' })
    store.markSaving()
    store.acceptSaved({ ...workspace, name: 'Updated title', draftVersion: 2 }, 1)

    expect(useCourseBuilderStore.getState()).toMatchObject({
      saveStatus: 'saved',
      course: { draftVersion: 2 },
    })
  })

  it('preserves newer local content when an older save resolves', () => {
    const store = useCourseBuilderStore.getState()
    store.initialize(workspace)
    store.updateCourse((course) => ({ ...course, name: 'First edit' }))
    store.markSaving()
    store.updateCourse((course) => ({ ...course, name: 'Newest edit' }))
    store.acceptSaved({ ...workspace, name: 'First edit', draftVersion: 2 }, 1)

    expect(useCourseBuilderStore.getState()).toMatchObject({
      saveStatus: 'dirty',
      course: { name: 'Newest edit', draftVersion: 2 },
    })
  })
})

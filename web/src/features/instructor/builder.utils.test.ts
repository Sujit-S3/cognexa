import { describe, expect, it } from 'vitest'
import type { CourseModuleView } from '../../services/api'
import { moveItem, moveLesson, normalizeCurriculum } from './builder.utils'

const modules: CourseModuleView[] = [
  {
    _id: '507f1f77bcf86cd799439011',
    title: 'Foundations',
    order: 0,
    moduleItems: [
      { _id: '507f1f77bcf86cd799439012', title: 'One', type: 'markdown', order: 0, isPreview: false },
      { _id: '507f1f77bcf86cd799439013', title: 'Two', type: 'video', order: 1, isPreview: false },
    ],
  },
  {
    _id: '507f1f77bcf86cd799439014',
    title: 'Advanced',
    order: 1,
    moduleItems: [],
  },
]

describe('course builder ordering', () => {
  it('moves modules without mutating the source array', () => {
    const moved = moveItem(modules, 0, 1)
    expect(moved.map((module) => module.title)).toEqual(['Advanced', 'Foundations'])
    expect(modules[0].title).toBe('Foundations')
  })

  it('moves lessons across modules and normalizes nested order', () => {
    const moved = moveLesson(modules, 0, 0, 1)
    expect(moved[0].moduleItems.map((lesson) => lesson.title)).toEqual(['Two'])
    expect(moved[1].moduleItems.map((lesson) => lesson.title)).toEqual(['One'])
    expect(moved[0].moduleItems[0].order).toBe(0)
    expect(moved[1].moduleItems[0].order).toBe(0)
  })

  it('normalizes all module and lesson positions', () => {
    const normalized = normalizeCurriculum([...modules].reverse())
    expect(normalized.map((module) => module.order)).toEqual([0, 1])
    expect(normalized[1].moduleItems.map((lesson) => lesson.order)).toEqual([0, 1])
  })
})

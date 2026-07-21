import type { CourseLessonView, CourseModuleView } from '../../services/api'

export function createObjectId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function normalizeCurriculum(modules: CourseModuleView[]): CourseModuleView[] {
  return modules.map((module, moduleIndex) => ({
    ...module,
    order: moduleIndex,
    moduleItems: module.moduleItems.map((lesson, lessonIndex) => ({
      ...lesson,
      order: lessonIndex,
    })),
  }))
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function moveLesson(
  modules: CourseModuleView[],
  sourceModule: number,
  sourceLesson: number,
  targetModule: number,
  targetLesson?: number
): CourseModuleView[] {
  if (!modules[sourceModule]?.moduleItems[sourceLesson] || !modules[targetModule]) return modules
  const next = modules.map((module) => ({ ...module, moduleItems: [...module.moduleItems] }))
  const [lesson] = next[sourceModule].moduleItems.splice(sourceLesson, 1)
  const insertion = targetLesson === undefined ? next[targetModule].moduleItems.length : targetLesson
  const adjusted = sourceModule === targetModule && sourceLesson < insertion ? insertion - 1 : insertion
  next[targetModule].moduleItems.splice(Math.max(0, adjusted), 0, lesson)
  return normalizeCurriculum(next)
}

export function createLesson(type: CourseLessonView['type'] = 'video'): CourseLessonView {
  return {
    _id: createObjectId(),
    title: 'Untitled lesson',
    type,
    order: 0,
    isPreview: false,
  }
}

import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { CourseLessonView, CourseModuleView, CourseWorkspace, LessonType } from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { UploadField } from './UploadField'
import { RichTextEditor } from './RichTextEditor'
import { createLesson, createObjectId, moveItem, moveLesson, normalizeCurriculum } from './builder.utils'
import styles from './InstructorWorkspace.module.css'

const lessonTypes: Array<{ value: LessonType; label: string }> = [
  { value: 'video', label: 'Video' },
  { value: 'pdf', label: 'PDF' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'rich_text', label: 'Rich text' },
  { value: 'external_url', label: 'External URL' },
  { value: 'youtube', label: 'Embedded YouTube' },
  { value: 'live_session', label: 'Live session' },
]

type LessonLocation = { moduleIndex: number; lessonIndex: number }
type DragState = { kind: 'module'; moduleIndex: number } | ({ kind: 'lesson' } & LessonLocation)

interface CurriculumBuilderProps {
  course: CourseWorkspace
  courseId: string
  onChange: (updater: (course: CourseWorkspace) => CourseWorkspace) => void
}

function lessonKey(lesson: CourseLessonView) {
  return lesson._id ?? lesson.id ?? `${lesson.order}-${lesson.title}`
}

export function CurriculumBuilder({ course, courseId, onChange }: CurriculumBuilderProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<LessonLocation | null>(null)
  const [dragging, setDragging] = useState<DragState | null>(null)

  const setModules = (modules: CourseModuleView[]) =>
    onChange((current) => ({ ...current, modules: normalizeCurriculum(modules) }))

  const updateModule = (moduleIndex: number, patch: Partial<CourseModuleView>) =>
    setModules(
      course.modules.map((module, index) => (index === moduleIndex ? { ...module, ...patch } : module))
    )

  const updateLesson = (location: LessonLocation, patch: Partial<CourseLessonView>) => {
    setModules(
      course.modules.map((module, moduleIndex) =>
        moduleIndex === location.moduleIndex
          ? {
              ...module,
              moduleItems: module.moduleItems.map((lesson, lessonIndex) =>
                lessonIndex === location.lessonIndex ? { ...lesson, ...patch } : lesson
              ),
            }
          : module
      )
    )
  }

  const addModule = () => {
    const module: CourseModuleView = {
      _id: createObjectId(),
      title: `Module ${course.modules.length + 1}`,
      description: '',
      order: course.modules.length,
      moduleItems: [],
    }
    setModules([...course.modules, module])
    setExpanded((current) => ({ ...current, [module._id!]: true }))
  }

  const addLesson = (moduleIndex: number, type: LessonType = 'video') => {
    const lesson = { ...createLesson(type), order: course.modules[moduleIndex].moduleItems.length }
    const modules = course.modules.map((module, index) =>
      index === moduleIndex ? { ...module, moduleItems: [...module.moduleItems, lesson] } : module
    )
    setModules(modules)
    setEditing({ moduleIndex, lessonIndex: modules[moduleIndex].moduleItems.length - 1 })
  }

  const removeModule = (moduleIndex: number) => {
    const module = course.modules[moduleIndex]
    const message = module.moduleItems.length
      ? `Delete “${module.title}” and its ${module.moduleItems.length} lessons?`
      : `Delete “${module.title}”?`
    if (window.confirm(message)) setModules(course.modules.filter((_, index) => index !== moduleIndex))
  }

  const duplicateLesson = ({ moduleIndex, lessonIndex }: LessonLocation) => {
    const source = course.modules[moduleIndex].moduleItems[lessonIndex]
    const copy: CourseLessonView = {
      ...source,
      _id: createObjectId(),
      id: undefined,
      title: `${source.title} (copy)`,
      order: lessonIndex + 1,
    }
    const items = [...course.modules[moduleIndex].moduleItems]
    items.splice(lessonIndex + 1, 0, copy)
    updateModule(moduleIndex, { moduleItems: items })
  }

  const removeLesson = ({ moduleIndex, lessonIndex }: LessonLocation) => {
    const lesson = course.modules[moduleIndex].moduleItems[lessonIndex]
    if (!window.confirm(`Delete “${lesson.title}”?`)) return
    updateModule(moduleIndex, {
      moduleItems: course.modules[moduleIndex].moduleItems.filter((_, index) => index !== lessonIndex),
    })
    setEditing(null)
  }

  const editingLesson = editing
    ? course.modules[editing.moduleIndex]?.moduleItems[editing.lessonIndex]
    : undefined

  return (
    <div className={styles.builderLayout}>
      <section className={styles.builderMain} aria-labelledby="curriculum-heading">
        <div className={styles.sectionHeading}>
          <div>
            <Badge tone="cyan">Curriculum</Badge>
            <h2 id="curriculum-heading">Build the learning journey</h2>
            <p>Drag modules and lessons to reorder them, or use the keyboard-friendly arrow controls.</p>
          </div>
          <Button type="button" leftIcon={<Plus size={17} />} onClick={addModule}>
            Add module
          </Button>
        </div>

        {course.modules.length === 0 ? (
          <GlassCard className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">
              01
            </span>
            <h3>Start with your first module</h3>
            <p>Group related lessons into a clear sequence learners can follow.</p>
            <Button type="button" onClick={addModule}>
              Create first module
            </Button>
          </GlassCard>
        ) : (
          <div className={styles.moduleList}>
            {course.modules.map((module, moduleIndex) => {
              const key = module._id ?? module.id ?? String(moduleIndex)
              const isOpen = expanded[key] ?? true
              return (
                <GlassCard
                  key={key}
                  className={styles.moduleCard}
                  draggable
                  onDragStart={() => setDragging({ kind: 'module', moduleIndex })}
                  onDragEnd={() => setDragging(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragging?.kind === 'module') {
                      setModules(moveItem(course.modules, dragging.moduleIndex, moduleIndex))
                    } else if (dragging?.kind === 'lesson') {
                      setModules(
                        moveLesson(course.modules, dragging.moduleIndex, dragging.lessonIndex, moduleIndex)
                      )
                    }
                    setDragging(null)
                  }}
                >
                  <div className={styles.moduleHeader}>
                    <GripVertical className={styles.dragHandle} aria-hidden="true" />
                    <button
                      type="button"
                      className={styles.disclosure}
                      aria-expanded={isOpen}
                      onClick={() => setExpanded((current) => ({ ...current, [key]: !isOpen }))}
                    >
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className={styles.moduleNumber}>{String(moduleIndex + 1).padStart(2, '0')}</span>
                    </button>
                    <div className={styles.moduleTitleFields}>
                      <input
                        className={styles.moduleTitleInput}
                        value={module.title}
                        aria-label={`Module ${moduleIndex + 1} title`}
                        onChange={(event) => updateModule(moduleIndex, { title: event.target.value })}
                      />
                      <span>
                        {module.moduleItems.length} lesson{module.moduleItems.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className={styles.iconActions}>
                      <button
                        type="button"
                        aria-label="Move module up"
                        disabled={moduleIndex === 0}
                        onClick={() => setModules(moveItem(course.modules, moduleIndex, moduleIndex - 1))}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Move module down"
                        disabled={moduleIndex === course.modules.length - 1}
                        onClick={() => setModules(moveItem(course.modules, moduleIndex, moduleIndex + 1))}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete module"
                        onClick={() => removeModule(moduleIndex)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className={styles.moduleBody}>
                      <textarea
                        className={styles.moduleDescription}
                        rows={2}
                        value={module.description ?? ''}
                        aria-label={`${module.title} description`}
                        placeholder="Optional module overview"
                        onChange={(event) => updateModule(moduleIndex, { description: event.target.value })}
                      />
                      <div className={styles.lessonList}>
                        {module.moduleItems.map((lesson, lessonIndex) => (
                          <div
                            key={lessonKey(lesson)}
                            className={styles.lessonRow}
                            draggable
                            onDragStart={(event) => {
                              event.stopPropagation()
                              setDragging({ kind: 'lesson', moduleIndex, lessonIndex })
                            }}
                            onDragEnd={() => setDragging(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              if (dragging?.kind === 'lesson') {
                                setModules(
                                  moveLesson(
                                    course.modules,
                                    dragging.moduleIndex,
                                    dragging.lessonIndex,
                                    moduleIndex,
                                    lessonIndex
                                  )
                                )
                              }
                              setDragging(null)
                            }}
                          >
                            <GripVertical size={16} className={styles.dragHandle} aria-hidden="true" />
                            <span className={styles.lessonType}>
                              {lessonTypes.find((item) => item.value === lesson.type)?.label ?? lesson.type}
                            </span>
                            <button
                              type="button"
                              className={styles.lessonTitle}
                              onClick={() => setEditing({ moduleIndex, lessonIndex })}
                            >
                              {lesson.title}
                            </button>
                            {lesson.isPreview && <Badge tone="success">Preview</Badge>}
                            <div className={styles.iconActions}>
                              <button
                                type="button"
                                aria-label="Move lesson up"
                                disabled={lessonIndex === 0}
                                onClick={() =>
                                  updateModule(moduleIndex, {
                                    moduleItems: moveItem(module.moduleItems, lessonIndex, lessonIndex - 1),
                                  })
                                }
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="Move lesson down"
                                disabled={lessonIndex === module.moduleItems.length - 1}
                                onClick={() =>
                                  updateModule(moduleIndex, {
                                    moduleItems: moveItem(module.moduleItems, lessonIndex, lessonIndex + 1),
                                  })
                                }
                              >
                                <ArrowDown size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="Edit lesson"
                                onClick={() => setEditing({ moduleIndex, lessonIndex })}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="Duplicate lesson"
                                onClick={() => duplicateLesson({ moduleIndex, lessonIndex })}
                              >
                                <Copy size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete lesson"
                                onClick={() => removeLesson({ moduleIndex, lessonIndex })}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className={styles.addLessonRow}>
                        <select className={styles.input} defaultValue="video" id={`lesson-type-${key}`}>
                          {lessonTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const select = document.getElementById(`lesson-type-${key}`) as HTMLSelectElement
                            addLesson(moduleIndex, select.value as LessonType)
                          }}
                        >
                          Add lesson
                        </Button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              )
            })}
          </div>
        )}
      </section>

      <aside className={styles.editorAside} aria-label="Lesson editor">
        {editing && editingLesson ? (
          <GlassCard className={styles.lessonEditor}>
            <div className={styles.editorCardHeader}>
              <div>
                <Badge tone="violet">Lesson editor</Badge>
                <h2>{editingLesson.title}</h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Close
              </Button>
            </div>
            <label>
              <span className={styles.label}>Lesson title</span>
              <input
                className={styles.input}
                value={editingLesson.title}
                onChange={(event) => updateLesson(editing, { title: event.target.value })}
              />
            </label>
            <label>
              <span className={styles.label}>Lesson type</span>
              <select
                className={styles.input}
                value={editingLesson.type}
                onChange={(event) =>
                  updateLesson(editing, {
                    type: event.target.value as LessonType,
                    url: undefined,
                    content: undefined,
                    asset: undefined,
                  })
                }
              >
                {lessonTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={styles.label}>Description</span>
              <textarea
                className={styles.textarea}
                rows={3}
                value={editingLesson.description ?? ''}
                onChange={(event) => updateLesson(editing, { description: event.target.value || undefined })}
              />
            </label>

            {editingLesson.type === 'video' && (
              <UploadField
                courseId={courseId}
                label="Lesson video"
                help="MP4, WebM, or MOV up to 500 MB. A first-frame thumbnail is generated automatically."
                purpose="lesson-video"
                resourceType="video"
                accept="video/mp4,video/webm,video/quicktime"
                value={editingLesson.asset}
                onUploaded={(asset) => updateLesson(editing, { asset, url: asset.url })}
                onRemove={() => updateLesson(editing, { asset: undefined, url: undefined })}
              />
            )}
            {editingLesson.type === 'pdf' && (
              <UploadField
                courseId={courseId}
                label="Lesson PDF"
                help="Upload the learner-facing PDF resource."
                purpose="lesson-file"
                resourceType="raw"
                accept="application/pdf"
                value={editingLesson.asset}
                onUploaded={(asset) => updateLesson(editing, { asset, url: asset.url })}
                onRemove={() => updateLesson(editing, { asset: undefined, url: undefined })}
              />
            )}
            {editingLesson.type === 'markdown' && (
              <label>
                <span className={styles.label}>Markdown content</span>
                <textarea
                  className={`${styles.textarea} ${styles.contentEditor}`}
                  rows={14}
                  value={editingLesson.content ?? ''}
                  onChange={(event) => updateLesson(editing, { content: event.target.value || undefined })}
                  placeholder="## Lesson objective"
                />
                <small>CommonMark-compatible Markdown is supported.</small>
              </label>
            )}
            {editingLesson.type === 'rich_text' && (
              <RichTextEditor
                label="Lesson content"
                value={editingLesson.content ?? ''}
                onChange={(content) => updateLesson(editing, { content: content || undefined })}
                help="Use semantic headings and descriptive links for accessible lesson content."
              />
            )}
            {(editingLesson.type === 'external_url' ||
              editingLesson.type === 'youtube' ||
              editingLesson.type === 'live_session') && (
              <label>
                <span className={styles.label}>
                  {editingLesson.type === 'youtube'
                    ? 'YouTube URL'
                    : editingLesson.type === 'live_session'
                      ? 'Session link (optional until scheduled)'
                      : 'External URL'}
                </span>
                <input
                  className={styles.input}
                  type="url"
                  value={editingLesson.url ?? ''}
                  placeholder="https://"
                  onChange={(event) => updateLesson(editing, { url: event.target.value || undefined })}
                />
              </label>
            )}
            <div className={styles.formGrid}>
              <label>
                <span className={styles.label}>Duration (minutes)</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={editingLesson.durationMinutes ?? ''}
                  onChange={(event) =>
                    updateLesson(editing, {
                      durationMinutes: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                />
              </label>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={editingLesson.isPreview}
                  onChange={(event) => updateLesson(editing, { isPreview: event.target.checked })}
                />
                <span>Available in course preview</span>
              </label>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className={styles.asidePlaceholder}>
            <Pencil size={22} aria-hidden="true" />
            <h3>Select a lesson to edit</h3>
            <p>Configure its content, upload, duration, and preview access here.</p>
          </GlassCard>
        )}
      </aside>
    </div>
  )
}

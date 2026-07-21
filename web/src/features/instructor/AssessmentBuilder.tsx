import { useState } from 'react'
import { ClipboardCheck, Copy, FileText, Plus, Trash2 } from 'lucide-react'
import type {
  BuilderQuestionType,
  BuilderQuestionView,
  CourseAssessmentView,
  CourseWorkspace,
} from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { UploadField } from './UploadField'
import { RichTextEditor } from './RichTextEditor'
import { createObjectId } from './builder.utils'
import styles from './InstructorWorkspace.module.css'

interface AssessmentBuilderProps {
  course: CourseWorkspace
  courseId: string
  onChange: (updater: (course: CourseWorkspace) => CourseWorkspace) => void
}

const questionTypes: Array<{ value: BuilderQuestionType; label: string }> = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'multiple_select', label: 'Multiple select' },
  { value: 'true_false', label: 'True / false' },
  { value: 'fill_blank', label: 'Fill in the blank' },
]

function createAssessment(kind: CourseAssessmentView['kind'], order: number): CourseAssessmentView {
  return {
    _id: createObjectId(),
    kind,
    title: kind === 'quiz' ? 'Untitled quiz' : 'Untitled assignment',
    instructions: '',
    order,
    visibility: 'draft',
    questions: [],
    randomizeQuestions: false,
    randomizeAnswers: false,
    passingScore: 70,
    attachments: [],
    rubric: [],
    submissionLimit: 1,
  }
}

function createQuestion(type: BuilderQuestionType): BuilderQuestionView {
  return {
    _id: createObjectId(),
    prompt: '',
    type,
    options:
      type === 'true_false' ? ['True', 'False'] : type === 'fill_blank' ? [] : ['Option 1', 'Option 2'],
    correctAnswers: [],
    points: 1,
    pool: 'Default',
  }
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function AssessmentBuilder({ course, courseId, onChange }: AssessmentBuilderProps) {
  const [selected, setSelected] = useState(0)

  const setAssessments = (assessments: CourseAssessmentView[]) =>
    onChange((current) => ({
      ...current,
      assessments: assessments.map((assessment, index) => ({ ...assessment, order: index })),
    }))

  const updateAssessment = (patch: Partial<CourseAssessmentView>) =>
    setAssessments(
      course.assessments.map((assessment, index) =>
        index === selected ? { ...assessment, ...patch } : assessment
      )
    )

  const addAssessment = (kind: CourseAssessmentView['kind']) => {
    setAssessments([...course.assessments, createAssessment(kind, course.assessments.length)])
    setSelected(course.assessments.length)
  }

  const removeAssessment = () => {
    const current = course.assessments[selected]
    if (!current || !window.confirm(`Delete “${current.title}”?`)) return
    setAssessments(course.assessments.filter((_, index) => index !== selected))
    setSelected(Math.max(0, selected - 1))
  }

  const assessment = course.assessments[selected]

  const updateQuestion = (questionIndex: number, patch: Partial<BuilderQuestionView>) => {
    if (!assessment) return
    updateAssessment({
      questions: assessment.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...patch } : question
      ),
    })
  }

  return (
    <div className={styles.assessmentLayout}>
      <aside className={styles.assessmentNav} aria-label="Course assessments">
        <div className={styles.sectionHeadingCompact}>
          <div>
            <Badge tone="violet">Assessments</Badge>
            <h2>Knowledge checks</h2>
          </div>
        </div>
        <div className={styles.assessmentCreateButtons}>
          <Button
            type="button"
            size="sm"
            leftIcon={<ClipboardCheck size={16} />}
            onClick={() => addAssessment('quiz')}
          >
            New quiz
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            leftIcon={<FileText size={16} />}
            onClick={() => addAssessment('assignment')}
          >
            New assignment
          </Button>
        </div>
        <div className={styles.assessmentList}>
          {course.assessments.map((item, index) => (
            <button
              key={item._id ?? item.id ?? index}
              type="button"
              className={index === selected ? styles.assessmentSelected : undefined}
              onClick={() => setSelected(index)}
            >
              {item.kind === 'quiz' ? <ClipboardCheck size={17} /> : <FileText size={17} />}
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.kind} · {item.visibility}
                </small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className={styles.assessmentEditor} aria-live="polite">
        {!assessment ? (
          <GlassCard className={styles.emptyState}>
            <ClipboardCheck size={28} aria-hidden="true" />
            <h3>Create a quiz or assignment</h3>
            <p>Assess understanding with configurable questions, rubrics, attempts, and due dates.</p>
          </GlassCard>
        ) : (
          <GlassCard className={styles.editorCard}>
            <div className={styles.editorCardHeader}>
              <div>
                <Badge tone={assessment.kind === 'quiz' ? 'cyan' : 'brand'}>{assessment.kind}</Badge>
                <h2>{assessment.title}</h2>
                <p>Changes are included in the course autosave.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 size={16} />}
                onClick={removeAssessment}
              >
                Delete
              </Button>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.fullField}>
                <span className={styles.label}>Title</span>
                <input
                  className={styles.input}
                  value={assessment.title}
                  onChange={(event) => updateAssessment({ title: event.target.value })}
                />
              </label>
              <div className={styles.fullField}>
                <RichTextEditor
                  label="Instructions"
                  value={assessment.instructions ?? ''}
                  onChange={(instructions) => updateAssessment({ instructions: instructions || undefined })}
                  help="Explain the task, deliverables, and evaluation expectations."
                />
              </div>
              <label>
                <span className={styles.label}>Visibility</span>
                <select
                  className={styles.input}
                  value={assessment.visibility}
                  onChange={(event) =>
                    updateAssessment({ visibility: event.target.value as CourseAssessmentView['visibility'] })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published with course</option>
                </select>
              </label>
            </div>

            {assessment.kind === 'quiz' ? (
              <>
                <div className={styles.settingsGrid}>
                  <label>
                    <span className={styles.label}>Passing score (%)</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      max={100}
                      value={assessment.passingScore}
                      onChange={(event) => updateAssessment({ passingScore: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    <span className={styles.label}>Time limit (minutes)</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={assessment.timeLimitMinutes ?? ''}
                      onChange={(event) =>
                        updateAssessment({
                          timeLimitMinutes: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span className={styles.label}>Question pool size</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={assessment.questionPoolSize ?? ''}
                      onChange={(event) =>
                        updateAssessment({
                          questionPoolSize: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                    />
                  </label>
                  <label className={styles.checkField}>
                    <input
                      type="checkbox"
                      checked={assessment.randomizeQuestions}
                      onChange={(event) => updateAssessment({ randomizeQuestions: event.target.checked })}
                    />
                    <span>Randomize questions</span>
                  </label>
                  <label className={styles.checkField}>
                    <input
                      type="checkbox"
                      checked={assessment.randomizeAnswers}
                      onChange={(event) => updateAssessment({ randomizeAnswers: event.target.checked })}
                    />
                    <span>Randomize answer options</span>
                  </label>
                </div>

                <div className={styles.subsectionHeader}>
                  <div>
                    <h3>Questions</h3>
                    <p>{assessment.questions.length} configured</p>
                  </div>
                  <div className={styles.inlineFields}>
                    <select className={styles.input} id="new-question-type" defaultValue="mcq">
                      {questionTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      leftIcon={<Plus size={16} />}
                      onClick={() => {
                        const type = (document.getElementById('new-question-type') as HTMLSelectElement)
                          .value as BuilderQuestionType
                        updateAssessment({ questions: [...assessment.questions, createQuestion(type)] })
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className={styles.questionList}>
                  {assessment.questions.map((question, questionIndex) => (
                    <div className={styles.questionCard} key={question._id ?? question.id ?? questionIndex}>
                      <div className={styles.questionHeader}>
                        <strong>Question {questionIndex + 1}</strong>
                        <div className={styles.iconActions}>
                          <button
                            type="button"
                            aria-label="Duplicate question"
                            onClick={() => {
                              const questions = [...assessment.questions]
                              questions.splice(questionIndex + 1, 0, {
                                ...question,
                                _id: createObjectId(),
                                id: undefined,
                              })
                              updateAssessment({ questions })
                            }}
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete question"
                            onClick={() =>
                              updateAssessment({
                                questions: assessment.questions.filter((_, index) => index !== questionIndex),
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <label className={styles.fullField}>
                          <span className={styles.label}>Prompt</span>
                          <textarea
                            className={styles.textarea}
                            rows={3}
                            value={question.prompt}
                            onChange={(event) =>
                              updateQuestion(questionIndex, { prompt: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          <span className={styles.label}>Question type</span>
                          <select
                            className={styles.input}
                            value={question.type}
                            onChange={(event) => {
                              const type = event.target.value as BuilderQuestionType
                              updateQuestion(questionIndex, {
                                type,
                                options:
                                  type === 'true_false'
                                    ? ['True', 'False']
                                    : type === 'fill_blank'
                                      ? []
                                      : question.options,
                              })
                            }}
                          >
                            {questionTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className={styles.label}>Points</span>
                          <input
                            className={styles.input}
                            type="number"
                            min={1}
                            value={question.points}
                            onChange={(event) =>
                              updateQuestion(questionIndex, { points: Number(event.target.value) })
                            }
                          />
                        </label>
                        <label>
                          <span className={styles.label}>Question pool</span>
                          <input
                            className={styles.input}
                            value={question.pool ?? ''}
                            onChange={(event) =>
                              updateQuestion(questionIndex, { pool: event.target.value || undefined })
                            }
                          />
                        </label>
                        {question.type !== 'fill_blank' && question.type !== 'true_false' && (
                          <label className={styles.fullField}>
                            <span className={styles.label}>Options (one per line)</span>
                            <textarea
                              className={styles.textarea}
                              rows={4}
                              value={question.options.join('\n')}
                              onChange={(event) =>
                                updateQuestion(questionIndex, { options: splitLines(event.target.value) })
                              }
                            />
                          </label>
                        )}
                        <label className={styles.fullField}>
                          <span className={styles.label}>
                            Correct answer{question.type === 'multiple_select' ? 's (one per line)' : ''}
                          </span>
                          {question.type === 'true_false' ? (
                            <select
                              className={styles.input}
                              value={question.correctAnswers[0] ?? ''}
                              onChange={(event) =>
                                updateQuestion(questionIndex, {
                                  correctAnswers: event.target.value ? [event.target.value] : [],
                                })
                              }
                            >
                              <option value="">Select answer</option>
                              <option value="True">True</option>
                              <option value="False">False</option>
                            </select>
                          ) : (
                            <textarea
                              className={styles.textarea}
                              rows={2}
                              value={question.correctAnswers.join('\n')}
                              onChange={(event) =>
                                updateQuestion(questionIndex, {
                                  correctAnswers: splitLines(event.target.value),
                                })
                              }
                            />
                          )}
                        </label>
                        <label className={styles.fullField}>
                          <span className={styles.label}>Answer explanation</span>
                          <textarea
                            className={styles.textarea}
                            rows={2}
                            value={question.explanation ?? ''}
                            onChange={(event) =>
                              updateQuestion(questionIndex, { explanation: event.target.value || undefined })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className={styles.settingsGrid}>
                  <label>
                    <span className={styles.label}>Due date</span>
                    <input
                      className={styles.input}
                      type="datetime-local"
                      value={assessment.dueDate?.slice(0, 16) ?? ''}
                      onChange={(event) =>
                        updateAssessment({
                          dueDate: event.target.value
                            ? new Date(event.target.value).toISOString()
                            : undefined,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span className={styles.label}>Submission limit</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      max={100}
                      value={assessment.submissionLimit}
                      onChange={(event) => updateAssessment({ submissionLimit: Number(event.target.value) })}
                    />
                  </label>
                </div>
                <div className={styles.subsectionHeader}>
                  <div>
                    <h3>Attachments</h3>
                    <p>Provide briefs, starter files, or references.</p>
                  </div>
                </div>
                <UploadField
                  courseId={courseId}
                  label="Assignment attachment"
                  help="Upload one file at a time, up to 100 MB."
                  purpose="assignment-file"
                  resourceType="raw"
                  accept=".pdf,.doc,.docx,.zip,.csv,.txt,image/*"
                  onUploaded={(asset) =>
                    updateAssessment({ attachments: [...assessment.attachments, asset] })
                  }
                />
                {assessment.attachments.length > 0 && (
                  <ul className={styles.attachmentList}>
                    {assessment.attachments.map((attachment, index) => (
                      <li key={`${attachment.url}-${index}`}>
                        <a href={attachment.url} target="_blank" rel="noreferrer">
                          {attachment.originalName ?? `Attachment ${index + 1}`}
                        </a>
                        <button
                          type="button"
                          aria-label={`Remove ${attachment.originalName ?? 'attachment'}`}
                          onClick={() =>
                            updateAssessment({
                              attachments: assessment.attachments.filter(
                                (_, attachmentIndex) => attachmentIndex !== index
                              ),
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.subsectionHeader}>
                  <div>
                    <h3>Rubric</h3>
                    <p>Define transparent grading criteria.</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      updateAssessment({
                        rubric: [
                          ...assessment.rubric,
                          { _id: createObjectId(), title: 'New criterion', description: '', points: 10 },
                        ],
                      })
                    }
                  >
                    Add criterion
                  </Button>
                </div>
                <div className={styles.rubricList}>
                  {assessment.rubric.map((criterion, index) => (
                    <div className={styles.rubricRow} key={criterion._id ?? criterion.id ?? index}>
                      <input
                        className={styles.input}
                        aria-label={`Criterion ${index + 1} title`}
                        value={criterion.title}
                        onChange={(event) =>
                          updateAssessment({
                            rubric: assessment.rubric.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, title: event.target.value } : item
                            ),
                          })
                        }
                      />
                      <input
                        className={styles.input}
                        aria-label={`Criterion ${index + 1} description`}
                        value={criterion.description ?? ''}
                        onChange={(event) =>
                          updateAssessment({
                            rubric: assessment.rubric.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, description: event.target.value } : item
                            ),
                          })
                        }
                      />
                      <input
                        className={styles.input}
                        aria-label={`Criterion ${index + 1} points`}
                        type="number"
                        min={0}
                        value={criterion.points}
                        onChange={(event) =>
                          updateAssessment({
                            rubric: assessment.rubric.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, points: Number(event.target.value) } : item
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Remove rubric criterion"
                        onClick={() =>
                          updateAssessment({
                            rubric: assessment.rubric.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </GlassCard>
        )}
      </section>
    </div>
  )
}

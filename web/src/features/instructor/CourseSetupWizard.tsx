import { useState } from 'react'
import { z } from 'zod'
import type { CourseWorkspace } from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { UploadField } from './UploadField'
import styles from './InstructorWorkspace.module.css'

const steps = ['Basics', 'Classification', 'Pricing', 'Discoverability'] as const

const stepSchemas = [
  z.object({
    name: z.string().trim().min(3, 'Use at least 3 characters').max(160),
    description: z.string().trim().min(40, 'Use at least 40 characters').max(20_000),
  }),
  z.object({
    category: z.string().trim().min(1, 'Choose a category'),
    language: z.string().trim().min(1, 'Choose a language'),
    tags: z.array(z.string()).min(1, 'Add at least one tag'),
  }),
  z
    .object({
      pricing: z.object({
        model: z.enum(['free', 'paid']),
        amount: z.number().nonnegative(),
      }),
    })
    .refine((value) => value.pricing.model === 'free' || value.pricing.amount > 0, {
      message: 'Paid courses require a positive price',
      path: ['pricing', 'amount'],
    }),
  z.object({
    seo: z.object({
      title: z.string().trim().min(1, 'Add an SEO title').max(70),
      description: z.string().trim().min(1, 'Add an SEO description').max(170),
      slug: z
        .string()
        .trim()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens'),
    }),
  }),
] as const

function commaList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ]
}

interface CourseSetupWizardProps {
  course: CourseWorkspace
  courseId: string
  onChange: (updater: (course: CourseWorkspace) => CourseWorkspace) => void
}

export function CourseSetupWizard({ course, courseId, onChange }: CourseSetupWizardProps) {
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<string[]>([])

  const patch = (values: Partial<CourseWorkspace>) => onChange((current) => ({ ...current, ...values }))

  const validateStep = () => {
    const result = stepSchemas[step].safeParse(course)
    if (result.success) {
      setErrors([])
      return true
    }
    setErrors(result.error.issues.map((issue) => issue.message))
    return false
  }

  return (
    <div className={styles.wizard}>
      <ol className={styles.stepper} aria-label="Course setup progress">
        {steps.map((label, index) => (
          <li key={label} className={index <= step ? styles.stepActive : undefined}>
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={index === step ? 'step' : undefined}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className={styles.wizardProgress} aria-hidden="true">
        <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      {errors.length > 0 && (
        <div className={styles.validationSummary} role="alert">
          <strong>Complete this step before continuing:</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {step === 0 && (
        <GlassCard className={styles.editorCard}>
          <div className={styles.editorCardHeader}>
            <div>
              <Badge tone="brand">Step 1</Badge>
              <h2>Course basics</h2>
              <p>Give learners a clear promise and recognizable course identity.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.fullField}>
              <span className={styles.label}>Course title</span>
              <input
                className={styles.input}
                value={course.name}
                maxLength={160}
                onChange={(event) => patch({ name: event.target.value })}
              />
              <small>{course.name.length}/160</small>
            </label>
            <label className={styles.fullField}>
              <span className={styles.label}>Subtitle</span>
              <input
                className={styles.input}
                value={course.subtitle ?? ''}
                maxLength={240}
                onChange={(event) => patch({ subtitle: event.target.value })}
                placeholder="A concise learner-facing promise"
              />
            </label>
            <label className={styles.fullField}>
              <span className={styles.label}>Description</span>
              <textarea
                className={styles.textarea}
                rows={7}
                value={course.description ?? ''}
                onChange={(event) => patch({ description: event.target.value })}
                placeholder="What will learners understand, build, or be able to do?"
              />
              <small>{course.description?.length ?? 0} characters · minimum 40 before review</small>
            </label>
          </div>

          <div className={styles.mediaGrid}>
            <UploadField
              courseId={courseId}
              label="Course thumbnail"
              help="Square or 16:9 image, up to 10 MB. Required before review."
              purpose="thumbnail"
              resourceType="image"
              accept="image/png,image/jpeg,image/webp"
              value={course.thumbnail}
              onUploaded={(thumbnail) => patch({ thumbnail, image: thumbnail.url })}
              onRemove={() => patch({ thumbnail: undefined, image: undefined })}
            />
            <UploadField
              courseId={courseId}
              label="Course banner"
              help="Wide image used across the course header and preview."
              purpose="banner"
              resourceType="image"
              accept="image/png,image/jpeg,image/webp"
              value={course.banner}
              onUploaded={(banner) => patch({ banner })}
              onRemove={() => patch({ banner: undefined })}
            />
          </div>
        </GlassCard>
      )}

      {step === 1 && (
        <GlassCard className={styles.editorCard}>
          <div className={styles.editorCardHeader}>
            <div>
              <Badge tone="cyan">Step 2</Badge>
              <h2>Classification</h2>
              <p>Help the right learners discover and understand the course.</p>
            </div>
          </div>
          <div className={styles.formGrid}>
            <label>
              <span className={styles.label}>Category</span>
              <input
                className={styles.input}
                value={course.category ?? ''}
                onChange={(event) => patch({ category: event.target.value })}
                placeholder="e.g. Data Science"
              />
            </label>
            <label>
              <span className={styles.label}>Language</span>
              <input
                className={styles.input}
                value={course.language}
                onChange={(event) => patch({ language: event.target.value })}
              />
            </label>
            <label>
              <span className={styles.label}>Level</span>
              <select
                className={styles.input}
                value={course.level}
                onChange={(event) => patch({ level: event.target.value as CourseWorkspace['level'] })}
              >
                <option value="all-levels">All levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label>
              <span className={styles.label}>Tags</span>
              <input
                className={styles.input}
                value={course.tags.join(', ')}
                onChange={(event) => patch({ tags: commaList(event.target.value) })}
                placeholder="ai, engineering, leadership"
              />
              <small>Separate tags with commas.</small>
            </label>
          </div>
        </GlassCard>
      )}

      {step === 2 && (
        <GlassCard className={styles.editorCard}>
          <div className={styles.editorCardHeader}>
            <div>
              <Badge tone="violet">Step 3</Badge>
              <h2>Pricing and expectations</h2>
              <p>Set the course model, expected duration, and learner prerequisites.</p>
            </div>
          </div>
          <div className={styles.formGrid}>
            <label>
              <span className={styles.label}>Pricing model</span>
              <select
                className={styles.input}
                value={course.pricing.model}
                onChange={(event) =>
                  patch({
                    pricing: {
                      ...course.pricing,
                      model: event.target.value as 'free' | 'paid',
                      amount: event.target.value === 'free' ? 0 : course.pricing.amount,
                    },
                  })
                }
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label>
              <span className={styles.label}>Price</span>
              <div className={styles.inlineFields}>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={course.pricing.model === 'free'}
                  value={course.pricing.amount}
                  onChange={(event) =>
                    patch({ pricing: { ...course.pricing, amount: Number(event.target.value) } })
                  }
                />
                <input
                  className={styles.input}
                  value={course.pricing.currency}
                  maxLength={3}
                  onChange={(event) =>
                    patch({ pricing: { ...course.pricing, currency: event.target.value.toUpperCase() } })
                  }
                  aria-label="Currency"
                />
              </div>
            </label>
            <label>
              <span className={styles.label}>Estimated duration (minutes)</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={course.durationMinutes ?? ''}
                onChange={(event) =>
                  patch({ durationMinutes: event.target.value ? Number(event.target.value) : undefined })
                }
              />
            </label>
            <label>
              <span className={styles.label}>Prerequisites</span>
              <textarea
                className={styles.textarea}
                rows={4}
                value={course.prerequisites.join(', ')}
                onChange={(event) => patch({ prerequisites: commaList(event.target.value) })}
                placeholder="Basic JavaScript, algebra fundamentals"
              />
              <small>Separate prerequisites with commas.</small>
            </label>
          </div>
        </GlassCard>
      )}

      {step === 3 && (
        <GlassCard className={styles.editorCard}>
          <div className={styles.editorCardHeader}>
            <div>
              <Badge tone="success">Step 4</Badge>
              <h2>Discoverability</h2>
              <p>Prepare concise search and social metadata before publishing.</p>
            </div>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.fullField}>
              <span className={styles.label}>SEO title</span>
              <input
                className={styles.input}
                value={course.seo.title ?? ''}
                maxLength={70}
                onChange={(event) => patch({ seo: { ...course.seo, title: event.target.value } })}
              />
              <small>{course.seo.title?.length ?? 0}/70</small>
            </label>
            <label className={styles.fullField}>
              <span className={styles.label}>SEO description</span>
              <textarea
                className={styles.textarea}
                rows={4}
                value={course.seo.description ?? ''}
                maxLength={170}
                onChange={(event) => patch({ seo: { ...course.seo, description: event.target.value } })}
              />
              <small>{course.seo.description?.length ?? 0}/170</small>
            </label>
            <label className={styles.fullField}>
              <span className={styles.label}>URL slug</span>
              <div className={styles.slugField}>
                <span>/courses/</span>
                <input
                  className={styles.input}
                  value={course.seo.slug ?? ''}
                  onChange={(event) =>
                    patch({
                      seo: {
                        ...course.seo,
                        slug: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9\s-]/g, '')
                          .trim()
                          .replace(/\s+/g, '-'),
                      },
                    })
                  }
                />
              </div>
            </label>
          </div>
        </GlassCard>
      )}

      <div className={styles.wizardActions}>
        <Button
          type="button"
          variant="ghost"
          disabled={step === 0}
          onClick={() => setStep((value) => value - 1)}
        >
          Previous
        </Button>
        {step < steps.length - 1 ? (
          <Button
            type="button"
            onClick={() => {
              if (validateStep()) setStep((value) => value + 1)
            }}
          >
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={validateStep}>
            Validate setup
          </Button>
        )}
      </div>
    </div>
  )
}

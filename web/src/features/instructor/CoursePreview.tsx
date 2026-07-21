import { BookOpen, CheckCircle2, Clock3, Eye, FileQuestion, Globe2, Layers3 } from 'lucide-react'
import type { CourseWorkspace } from '../../services/api'
import { Badge, GlassCard } from '../../design'
import styles from './InstructorWorkspace.module.css'

export function CoursePreview({ course }: { course: CourseWorkspace }) {
  const lessonCount = course.modules.reduce((total, module) => total + module.moduleItems.length, 0)
  const price =
    course.pricing.model === 'free'
      ? 'Free'
      : new Intl.NumberFormat(undefined, { style: 'currency', currency: course.pricing.currency }).format(
          course.pricing.amount
        )

  return (
    <div className={styles.previewShell}>
      <div
        className={styles.previewBanner}
        style={
          course.banner?.url
            ? {
                backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.92), rgba(2,6,23,.48)), url(${course.banner.url})`,
              }
            : undefined
        }
      >
        <div className={styles.previewHeroCopy}>
          <Badge tone="violet">
            <Eye size={13} /> Instructor preview
          </Badge>
          <h2>{course.name || 'Untitled course'}</h2>
          <p className={styles.previewSubtitle}>
            {course.subtitle || 'Add a concise learner-facing promise in course setup.'}
          </p>
          <div className={styles.previewMeta}>
            <span>
              <Globe2 size={15} /> {course.language}
            </span>
            <span>
              <Layers3 size={15} /> {course.level.replace('-', ' ')}
            </span>
            <span>
              <Clock3 size={15} /> {course.durationMinutes ? `${course.durationMinutes} min` : 'Self-paced'}
            </span>
          </div>
        </div>
        <GlassCard className={styles.previewPurchaseCard}>
          {course.thumbnail?.url ? (
            <img src={course.thumbnail.url} alt="" />
          ) : (
            <div className={styles.previewImagePlaceholder}>
              <BookOpen size={30} />
            </div>
          )}
          <strong>{price}</strong>
          <button type="button" disabled>
            Enroll preview
          </button>
          <small>Enrollment is disabled in instructor preview.</small>
        </GlassCard>
      </div>

      <div className={styles.previewColumns}>
        <div className={styles.previewContent}>
          <GlassCard className={styles.previewSection}>
            <h3>About this course</h3>
            <p>{course.description || 'Your full course description will appear here.'}</p>
            {course.prerequisites.length > 0 && (
              <>
                <h3>Prerequisites</h3>
                <ul>
                  {course.prerequisites.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={15} /> {item}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </GlassCard>
          <GlassCard className={styles.previewSection}>
            <div className={styles.previewSectionHeader}>
              <h3>Curriculum</h3>
              <span>
                {course.modules.length} modules · {lessonCount} lessons
              </span>
            </div>
            {course.modules.length === 0 ? (
              <p>No curriculum has been added yet.</p>
            ) : (
              <div className={styles.previewModules}>
                {course.modules.map((module, moduleIndex) => (
                  <details key={module._id ?? module.id ?? moduleIndex} open={moduleIndex === 0}>
                    <summary>
                      <span>{String(moduleIndex + 1).padStart(2, '0')}</span>
                      <strong>{module.title}</strong>
                      <small>{module.moduleItems.length} lessons</small>
                    </summary>
                    <ul>
                      {module.moduleItems.map((lesson, lessonIndex) => (
                        <li key={lesson._id ?? lesson.id ?? lessonIndex}>
                          <BookOpen size={15} />
                          <span>{lesson.title}</span>
                          <small>{lesson.type.replace('_', ' ')}</small>
                          {lesson.isPreview && <Badge tone="success">Preview</Badge>}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
        <aside>
          <GlassCard className={styles.previewSection}>
            <h3>At a glance</h3>
            <dl className={styles.previewFacts}>
              <div>
                <dt>Category</dt>
                <dd>{course.category || 'Not set'}</dd>
              </div>
              <div>
                <dt>Lessons</dt>
                <dd>{lessonCount}</dd>
              </div>
              <div>
                <dt>Assessments</dt>
                <dd>{course.assessments.length}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{course.status}</dd>
              </div>
            </dl>
          </GlassCard>
          <GlassCard className={styles.previewSection}>
            <h3>
              <FileQuestion size={18} /> Assessments
            </h3>
            {course.assessments.length === 0 ? (
              <p>No assessments added.</p>
            ) : (
              <ul className={styles.simpleList}>
                {course.assessments.map((assessment) => (
                  <li key={assessment._id ?? assessment.id}>
                    {assessment.title}
                    <small>{assessment.kind}</small>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </aside>
      </div>
    </div>
  )
}

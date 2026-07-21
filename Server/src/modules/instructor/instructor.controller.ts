import { Request, Response } from 'express'
import { Types } from 'mongoose'
import { Achievement } from '../../models/achievement.model'
import { Course, CourseDocument, CourseStatus } from '../../models/course.model'
import { Submission } from '../../models/submission.model'
import { User } from '../../models/user.model'
import { asyncHandler } from '../../middleware/asyncHandler'
import { createCloudinaryUploadSignature } from '../../services/storage/cloudinary.service'
import { AppError } from '../../utils/AppError'
import { assertCourseRole } from '../../utils/courseAccess'

const uploadRules = {
  thumbnail: { resourceType: 'image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
  banner: { resourceType: 'image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
  'lesson-video': { resourceType: 'video', extensions: ['mp4', 'webm', 'mov'] },
  'lesson-file': { resourceType: 'raw', extensions: ['pdf'] },
  'assignment-file': {
    resourceType: 'raw',
    extensions: ['pdf', 'doc', 'docx', 'csv', 'txt', 'zip', 'jpg', 'jpeg', 'png', 'webp'],
  },
} as const

export function validateUploadIntent(
  purpose: keyof typeof uploadRules,
  resourceType: 'image' | 'video' | 'raw',
  originalName: string
): void {
  const rule = uploadRules[purpose]
  const extension = originalName.split('.').pop()?.toLowerCase()
  if (
    rule.resourceType !== resourceType ||
    !extension ||
    !(rule.extensions as readonly string[]).includes(extension)
  ) {
    throw new AppError(422, 'The selected file type is not allowed for this course asset')
  }
}

type PublishInspectableCourse = Pick<
  CourseDocument,
  | 'name'
  | 'description'
  | 'thumbnail'
  | 'category'
  | 'tags'
  | 'language'
  | 'pricing'
  | 'seo'
  | 'modules'
  | 'assessments'
>

export function collectPublishIssues(course: PublishInspectableCourse): string[] {
  const issues: string[] = []

  if (!course.name.trim() || course.name.trim().toLowerCase() === 'untitled course') {
    issues.push('Add a course title')
  }
  if (!course.description || course.description.trim().length < 40) {
    issues.push('Add a course description of at least 40 characters')
  }
  if (!course.thumbnail?.url) issues.push('Upload a course thumbnail')
  if (!course.category?.trim()) issues.push('Choose a category')
  if (!course.tags.length) issues.push('Add at least one tag')
  if (!course.language.trim()) issues.push('Choose a language')
  if (course.pricing.model === 'paid' && course.pricing.amount <= 0) {
    issues.push('Set a positive price for the paid course')
  }
  if (!course.seo.title?.trim()) issues.push('Add an SEO title')
  if (!course.seo.description?.trim()) issues.push('Add an SEO description')
  if (!course.seo.slug?.trim()) issues.push('Add an SEO slug')
  if (!course.modules.length) issues.push('Add at least one curriculum module')

  course.modules.forEach((module, moduleIndex) => {
    if (!module.moduleItems.length) issues.push(`Add a lesson to module ${moduleIndex + 1}`)
    module.moduleItems.forEach((lesson, lessonIndex) => {
      const label = `Module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`
      if (['video', 'pdf', 'file'].includes(lesson.type) && !lesson.asset?.url && !lesson.url) {
        issues.push(`${label} requires an uploaded asset`)
      }
      if (['external_url', 'youtube'].includes(lesson.type) && !lesson.url) {
        issues.push(`${label} requires a URL`)
      }
      if (['markdown', 'rich_text'].includes(lesson.type) && !lesson.content?.trim()) {
        issues.push(`${label} requires lesson content`)
      }
    })
  })

  course.assessments.forEach((assessment, assessmentIndex) => {
    const label = `${assessment.kind === 'quiz' ? 'Quiz' : 'Assignment'} ${assessmentIndex + 1}`
    if (assessment.kind === 'quiz') {
      if (!assessment.questions.length) issues.push(`${label} requires at least one question`)
      assessment.questions.forEach((question, questionIndex) => {
        if (!question.correctAnswers.length) {
          issues.push(`${label}, question ${questionIndex + 1} requires a correct answer`)
        }
        if (['mcq', 'multiple_select'].includes(question.type) && question.options.length < 2) {
          issues.push(`${label}, question ${questionIndex + 1} requires at least two options`)
        }
      })
      if (assessment.questionPoolSize && assessment.questionPoolSize > assessment.questions.length) {
        issues.push(`${label} question pool size exceeds its available questions`)
      }
    } else {
      if (!assessment.instructions?.trim()) issues.push(`${label} requires instructions`)
      if (!assessment.dueDate) issues.push(`${label} requires a due date`)
      if (!assessment.rubric.length) issues.push(`${label} requires at least one rubric criterion`)
    }
  })

  return issues
}

function managedCourseFilter(userId: Types.ObjectId, globalRole: string) {
  if (globalRole === 'admin') return {}
  return {
    $or: [{ createdBy: userId }, { enrollments: { $elemMatch: { user: userId, enrolledAs: 'instructor' } } }],
  }
}

function serializeWorkspace(course: CourseDocument) {
  const value = course.toJSON() as unknown as Record<string, unknown>
  return {
    id: value.id,
    name: course.name,
    subtitle: course.subtitle,
    description: course.description,
    image: course.image,
    thumbnail: course.thumbnail,
    banner: course.banner,
    category: course.category,
    tags: course.tags,
    language: course.language,
    level: course.level,
    durationMinutes: course.durationMinutes,
    prerequisites: course.prerequisites,
    pricing: course.pricing,
    seo: course.seo,
    modules: value.modules,
    assessments: value.assessments,
    status: course.status,
    reviewNotes: course.reviewNotes,
    reviewSubmittedAt: course.reviewSubmittedAt,
    publishedAt: course.publishedAt,
    draftVersion: course.draftVersion,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function summarizeCourse(course: CourseDocument, completionCount = 0) {
  const students = course.enrollments.filter((entry) => entry.enrolledAs === 'student')
  const lessonCount = course.modules.reduce((total, module) => total + module.moduleItems.length, 0)
  const serialized = course.toJSON() as unknown as Record<string, unknown>

  return {
    id: serialized.id,
    name: course.name,
    description: course.description,
    image: course.image,
    thumbnail: course.thumbnail,
    banner: course.banner,
    backgroundColor: course.backgroundColor,
    category: course.category,
    tags: course.tags,
    language: course.language,
    level: course.level,
    durationMinutes: course.durationMinutes,
    pricing: course.pricing,
    status: course.status,
    updatedAt: serialized.updatedAt,
    analytics: {
      studentCount: students.length,
      lessonCount,
      assessmentCount: course.assessments.length,
      completionCount,
      completionRate: students.length ? Math.round((completionCount / students.length) * 100) : 0,
    },
  }
}

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const courses = await Course.find(managedCourseFilter(req.user!._id, req.user!.role))
    .populate('enrollments.user', '_id name email photo lastSeenAt')
    .sort({ updatedAt: -1 })

  const courseIds = courses.map((course) => course._id)
  const [completionGroups, recentSubmissions, pendingSubmissions] = courseIds.length
    ? await Promise.all([
        Achievement.aggregate<{ _id: { course: Types.ObjectId; user: Types.ObjectId } }>([
          { $match: { course: { $in: courseIds } } },
          { $group: { _id: { course: '$course', user: '$user' } } },
        ]),
        Submission.find({ course: { $in: courseIds }, submittedAt: { $exists: true } })
          .sort({ submittedAt: -1 })
          .limit(10)
          .populate('student', 'name photo')
          .populate('assessment', 'title type'),
        Submission.countDocuments({
          course: { $in: courseIds },
          finished: true,
          autoGradingStatus: { $ne: 'Graded' },
        }),
      ])
    : [[], [], 0]

  const completedEnrollmentKeys = new Set(
    completionGroups.map((group) => `${group._id.course.toString()}:${group._id.user.toString()}`)
  )
  const completionByCourse = new Map<string, number>()
  completionGroups.forEach((group) => {
    const courseId = group._id.course.toString()
    completionByCourse.set(courseId, (completionByCourse.get(courseId) ?? 0) + 1)
  })
  const courseSummaries = courses.map((course) =>
    summarizeCourse(course, completionByCourse.get(course._id.toString()) ?? 0)
  )
  const students = courses.flatMap((course) =>
    course.enrollments
      .filter((entry) => entry.enrolledAs === 'student')
      .map((entry) => {
        const user = entry.user as unknown as {
          _id: Types.ObjectId
          name: string
          email: string
          photo?: string
          lastSeenAt?: Date
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          photo: user.photo,
          lastSeenAt: user.lastSeenAt,
          enrolledAt: entry.createdAt,
          course: { id: course._id.toString(), name: course.name },
          completed: completedEnrollmentKeys.has(`${course._id.toString()}:${user._id.toString()}`),
        }
      })
  )

  const totalStudents = courseSummaries.reduce((total, course) => total + course.analytics.studentCount, 0)
  const totalCompletions = courseSummaries.reduce(
    (total, course) => total + course.analytics.completionCount,
    0
  )

  res.set('cache-control', 'private, no-store').json({
    summary: {
      courseCount: courseSummaries.length,
      publishedCourseCount: courseSummaries.filter((course) => course.status === 'published').length,
      totalStudents,
      pendingSubmissions,
      completionRate: totalStudents ? Math.round((totalCompletions / totalStudents) * 100) : 0,
      revenue: null,
      revenueCurrency: 'USD',
      revenueStatus: 'not_configured',
    },
    courses: courseSummaries,
    students,
    recentActivity: recentSubmissions.map((submission) => {
      const student = submission.student as unknown as { name?: string }
      const assessment = submission.assessment as unknown as { title?: string; type?: string }
      return {
        id: submission._id.toString(),
        kind: 'submission',
        studentName: student?.name ?? 'Learner',
        assessmentTitle: assessment?.title ?? 'Assessment',
        assessmentType: assessment?.type,
        occurredAt: submission.submittedAt,
        courseId: submission.course.toString(),
      }
    }),
    topCourses: [...courseSummaries]
      .sort((left, right) => {
        if (right.analytics.completionRate !== left.analytics.completionRate) {
          return right.analytics.completionRate - left.analytics.completionRate
        }
        return right.analytics.studentCount - left.analytics.studentCount
      })
      .slice(0, 5)
      .map((course) => ({
        id: course.id,
        name: course.name,
        status: course.status,
        ...course.analytics,
      })),
  })
})

export const createDraft = asyncHandler(async (req: Request, res: Response) => {
  const course = new Course({
    name: req.body.name,
    description: '',
    createdBy: req.user!._id,
    lastEditedBy: req.user!._id,
    status: 'draft',
    tags: [],
    prerequisites: [],
    modules: [],
    assessments: [],
    pricing: { model: 'free', amount: 0, currency: 'USD' },
    seo: {},
  })
  course.enroll(req.user!._id, req.user!.role)
  await course.save()
  await User.updateOne({ _id: req.user!._id }, { $addToSet: { enrollments: course._id } })

  res.status(201).json(serializeWorkspace(course))
})

export const getWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])
  res.set('cache-control', 'private, no-store').json(serializeWorkspace(course))
})

export const saveWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const { draftVersion, ...workspace } = req.body
  if (draftVersion && draftVersion !== course.draftVersion) {
    throw new AppError(409, 'This draft was updated in another session', {
      latestVersion: course.draftVersion,
    })
  }

  Object.assign(course, workspace)
  course.lastEditedBy = req.user!._id
  course.draftVersion += 1
  await course.save()

  res.set('cache-control', 'private, no-store').json(serializeWorkspace(course))
})

const allowedTransitions: Record<CourseStatus, CourseStatus[]> = {
  draft: ['review', 'archived'],
  review: ['draft', 'published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft'],
}

export const transitionStatus = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.courseId).orFail(
    () => new AppError(404, 'Course not found')
  )
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  const nextStatus = req.body.status as CourseStatus
  if (nextStatus === course.status) {
    res.json(serializeWorkspace(course))
    return
  }
  if (!allowedTransitions[course.status].includes(nextStatus)) {
    throw new AppError(409, `Cannot move a course from ${course.status} to ${nextStatus}`)
  }

  if (['review', 'published'].includes(nextStatus)) {
    const issues = collectPublishIssues(course)
    if (issues.length) throw new AppError(422, 'Course is not ready for review or publishing', { issues })
  }

  course.status = nextStatus
  course.reviewNotes = req.body.reviewNotes
  course.lastEditedBy = req.user!._id
  course.draftVersion += 1
  if (nextStatus === 'review') course.reviewSubmittedAt = new Date()
  if (nextStatus === 'published') {
    course.publishedAt = new Date()
    course.assessments.forEach((assessment) => {
      assessment.visibility = 'published'
    })
  }
  await course.save()

  res.json(serializeWorkspace(course))
})

export const createUploadSignature = asyncHandler(async (req: Request, res: Response) => {
  validateUploadIntent(req.body.purpose, req.body.resourceType, req.body.originalName)
  const course = await Course.findById(req.body.courseId).orFail(() => new AppError(404, 'Course not found'))
  assertCourseRole(course, req.user!._id, req.user!.role, ['instructor', 'admin'])

  res.set('cache-control', 'no-store').json(
    createCloudinaryUploadSignature({
      courseId: course._id.toString(),
      purpose: req.body.purpose,
      resourceType: req.body.resourceType,
    })
  )
})

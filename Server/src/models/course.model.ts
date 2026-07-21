import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose'
import { DateTime } from 'luxon'
import { Assessment } from './assessment.model'
import { idTransform } from '../utils/mongoTransform'

export type CourseStatus = 'draft' | 'review' | 'published' | 'archived'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all-levels'
export type ModuleItemType =
  'video' | 'pdf' | 'markdown' | 'rich_text' | 'external_url' | 'youtube' | 'live_session' | 'file'

export interface UploadedAssetAttrs {
  url: string
  publicId?: string
  resourceType?: 'image' | 'video' | 'raw'
  format?: string
  bytes?: number
  originalName?: string
  thumbnailUrl?: string
}

const uploadedAssetSchema = new Schema<UploadedAssetAttrs>(
  {
    url: { type: String, required: true },
    publicId: String,
    resourceType: { type: String, enum: ['image', 'video', 'raw'] },
    format: String,
    bytes: Number,
    originalName: String,
    thumbnailUrl: String,
  },
  { _id: false }
)

export interface ModuleItemAttrs {
  title: string
  type: ModuleItemType
  order: number
  description?: string
  url?: string
  content?: string
  durationMinutes?: number
  isPreview: boolean
  asset?: UploadedAssetAttrs
}

const moduleItemSchema = new Schema<ModuleItemAttrs>({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  type: {
    type: String,
    enum: ['video', 'pdf', 'markdown', 'rich_text', 'external_url', 'youtube', 'live_session', 'file'],
    required: true,
  },
  order: { type: Number, required: true, min: 0 },
  description: { type: String, maxlength: 2_000 },
  url: { type: String, maxlength: 2_048 },
  content: { type: String, maxlength: 100_000 },
  durationMinutes: { type: Number, min: 0, max: 100_000 },
  isPreview: { type: Boolean, default: false },
  asset: uploadedAssetSchema,
})

export interface CourseModuleAttrs {
  title: string
  description?: string
  order: number
  moduleItems: Types.DocumentArray<ModuleItemAttrs>
}

const courseModuleSchema = new Schema<CourseModuleAttrs>({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, maxlength: 2_000 },
  order: { type: Number, required: true, min: 0 },
  moduleItems: [moduleItemSchema],
})

export type BuilderQuestionType = 'mcq' | 'multiple_select' | 'true_false' | 'fill_blank'

export interface BuilderQuestionAttrs {
  prompt: string
  type: BuilderQuestionType
  options: string[]
  correctAnswers: string[]
  explanation?: string
  points: number
  pool?: string
}

const builderQuestionSchema = new Schema<BuilderQuestionAttrs>({
  prompt: { type: String, required: true, trim: true, maxlength: 10_000 },
  type: {
    type: String,
    enum: ['mcq', 'multiple_select', 'true_false', 'fill_blank'],
    required: true,
  },
  options: [{ type: String, maxlength: 2_000 }],
  correctAnswers: [{ type: String, required: true, maxlength: 2_000 }],
  explanation: { type: String, maxlength: 10_000 },
  points: { type: Number, min: 1, max: 1_000, default: 1 },
  pool: { type: String, trim: true, maxlength: 120 },
})

export interface RubricCriterionAttrs {
  title: string
  description?: string
  points: number
}

const rubricCriterionSchema = new Schema<RubricCriterionAttrs>({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, maxlength: 2_000 },
  points: { type: Number, required: true, min: 0, max: 10_000 },
})

export interface CourseAssessmentAttrs {
  kind: 'quiz' | 'assignment'
  title: string
  instructions?: string
  order: number
  visibility: 'draft' | 'published'
  questions: Types.DocumentArray<BuilderQuestionAttrs>
  randomizeQuestions: boolean
  randomizeAnswers: boolean
  passingScore: number
  timeLimitMinutes?: number
  questionPoolSize?: number
  dueDate?: Date
  attachments: UploadedAssetAttrs[]
  rubric: Types.DocumentArray<RubricCriterionAttrs>
  submissionLimit: number
}

const courseAssessmentSchema = new Schema<CourseAssessmentAttrs>({
  kind: { type: String, enum: ['quiz', 'assignment'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  instructions: { type: String, maxlength: 100_000 },
  order: { type: Number, required: true, min: 0 },
  visibility: { type: String, enum: ['draft', 'published'], default: 'draft' },
  questions: [builderQuestionSchema],
  randomizeQuestions: { type: Boolean, default: false },
  randomizeAnswers: { type: Boolean, default: false },
  passingScore: { type: Number, min: 0, max: 100, default: 70 },
  timeLimitMinutes: { type: Number, min: 1, max: 1_440 },
  questionPoolSize: { type: Number, min: 1, max: 1_000 },
  dueDate: Date,
  attachments: [uploadedAssetSchema],
  rubric: [rubricCriterionSchema],
  submissionLimit: { type: Number, min: 1, max: 100, default: 1 },
})

export type EnrollmentRole = 'student' | 'instructor' | 'admin'

export interface EnrollmentAttrs {
  user: Types.ObjectId
  enrolledAs: EnrollmentRole
  createdAt: Date
}

const enrollmentSchema = new Schema<EnrollmentAttrs>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledAs: { type: String, enum: ['student', 'instructor', 'admin'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export interface CourseAttrs {
  name: string
  subtitle?: string
  description?: string
  createdAt: Date
  updatedAt: Date
  createdBy: Types.ObjectId
  lastEditedBy?: Types.ObjectId
  files: string[]
  image?: string
  thumbnail?: UploadedAssetAttrs
  banner?: UploadedAssetAttrs
  backgroundColor: string
  category?: string
  tags: string[]
  language: string
  level: CourseLevel
  durationMinutes?: number
  prerequisites: string[]
  pricing: {
    model: 'free' | 'paid'
    amount: number
    currency: string
  }
  seo: {
    title?: string
    description?: string
    slug?: string
  }
  modules: Types.DocumentArray<CourseModuleAttrs>
  assessments: Types.DocumentArray<CourseAssessmentAttrs>
  status: CourseStatus
  reviewNotes?: string
  reviewSubmittedAt?: Date
  publishedAt?: Date
  draftVersion: number
  enrollments: Types.DocumentArray<EnrollmentAttrs>
}

export type CourseDocument = HydratedDocument<CourseAttrs, CourseMethods>

export interface CourseVideo {
  id: Types.ObjectId
  title: string
  url: string
  type: ModuleItemType
  videoId: string | undefined
}

export interface CourseDeadline {
  title: string
  deadline: Date
  type: AssessmentTypeName
  assessmentId: Types.ObjectId
  course: { name: string; id: Types.ObjectId }
}

export type AssessmentTypeName = 'Exam' | 'Assignment'

export interface CoursePrivilegeView extends Record<string, unknown> {
  status: string
  enrolled: boolean
  privilege?: string
}

export interface CourseMethods {
  modulesJSON(): { modules: unknown[] }
  getVideos(): Array<CourseVideo | null>
  enroll(userId: Types.ObjectId | string, role: string): CourseDocument
  unEnroll(userId: Types.ObjectId | string): CourseDocument
  getInstructors(): EnrollmentAttrs[]
}

export interface CourseModelType extends Model<CourseAttrs, unknown, CourseMethods> {
  getCoursesWithPrivilege(
    userId: Types.ObjectId | string,
    globalRole?: string
  ): Promise<CoursePrivilegeView[]>
  getDeadLines(courseId: Types.ObjectId | string): Promise<Array<CourseDeadline | null>>
  formatCalendar(
    deadlines: Array<{ deadline: Date; [key: string]: unknown }>
  ): Record<string, Record<string, Record<string, unknown[]>>>
}

const courseSchema = new Schema<CourseAttrs, CourseModelType, CourseMethods>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 160 },
    subtitle: { type: String, maxlength: 240 },
    description: { type: String, maxlength: 20_000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastEditedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    files: [String],
    image: String,
    thumbnail: uploadedAssetSchema,
    banner: uploadedAssetSchema,
    backgroundColor: { type: String, default: '#4F46E5' },
    category: { type: String, trim: true, maxlength: 120 },
    tags: [{ type: String, trim: true, maxlength: 60 }],
    language: { type: String, default: 'English', maxlength: 80 },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
      default: 'all-levels',
    },
    durationMinutes: { type: Number, min: 0, max: 1_000_000 },
    prerequisites: [{ type: String, trim: true, maxlength: 240 }],
    pricing: {
      _id: false,
      model: { type: String, enum: ['free', 'paid'], default: 'free' },
      amount: { type: Number, min: 0, default: 0 },
      currency: { type: String, trim: true, uppercase: true, default: 'USD', maxlength: 3 },
    },
    seo: {
      _id: false,
      title: { type: String, maxlength: 70 },
      description: { type: String, maxlength: 170 },
      slug: { type: String, trim: true, lowercase: true, maxlength: 120 },
    },
    modules: [courseModuleSchema],
    assessments: [courseAssessmentSchema],
    status: {
      type: String,
      enum: ['draft', 'review', 'published', 'archived'],
      default: 'draft',
    },
    reviewNotes: { type: String, maxlength: 5_000 },
    reviewSubmittedAt: Date,
    publishedAt: Date,
    draftVersion: { type: Number, min: 1, default: 1 },
    enrollments: [enrollmentSchema],
  },
  { timestamps: true }
)

courseSchema.index({ createdBy: 1, status: 1, updatedAt: -1 })
courseSchema.index({ 'enrollments.user': 1, status: 1 })
courseSchema.index({ status: 1, category: 1, publishedAt: -1 })
courseSchema.index({ 'seo.slug': 1 }, { unique: true, sparse: true })
courseSchema.index({ name: 'text', description: 'text', tags: 'text' })

courseSchema.set('toJSON', { transform: idTransform })

courseSchema.methods.modulesJSON = function (this: CourseDocument) {
  return { modules: this.modules.map((module) => module.toJSON()) }
}

const YOUTUBE_ID_REGEX =
  /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/i

courseSchema.methods.getVideos = function (this: CourseDocument) {
  const videos = this.modules.flatMap((module) =>
    module.moduleItems.filter((item) => ['video', 'youtube'].includes(item.type) && Boolean(item.url))
  )

  return videos.map((video) => {
    const match = video.url ? YOUTUBE_ID_REGEX.exec(video.url) : null
    return {
      id: video._id,
      title: video.title,
      url: video.url ?? '',
      type: video.type,
      videoId: match?.[1],
    }
  })
}

courseSchema.statics.getCoursesWithPrivilege = async function (
  userId: Types.ObjectId | string,
  globalRole?: string
) {
  const accessFilter =
    globalRole === 'admin'
      ? {}
      : {
          $or: [{ status: 'published' }, { createdBy: userId }, { 'enrollments.user': userId }],
        }

  const courses = await this.find(accessFilter)
    .populate('enrollments.user createdBy', '_id name username email code photo')
    .sort({ updatedAt: -1 })

  return courses.map((course: CourseDocument) => {
    const coursePOJO = course.toJSON() as unknown as Record<string, unknown> & {
      enrollments?: Array<{ user: { _id: Types.ObjectId }; enrolledAs: string }>
      assessments?: Array<{
        questions?: Array<Record<string, unknown>>
      }>
      status: string
    }

    const enrollment = coursePOJO.enrollments?.find((entry) => {
      const enrollmentUser = entry.user?._id ?? entry.user
      return enrollmentUser?.toString() === userId.toString()
    })
    const isAdmin = globalRole === 'admin'
    const isCreator =
      course.createdBy?._id?.toString() === userId.toString() ||
      course.createdBy?.toString() === userId.toString()
    const privilege = isAdmin ? 'admin' : (enrollment?.enrolledAs ?? (isCreator ? 'instructor' : undefined))

    const result: Record<string, unknown> = {
      ...coursePOJO,
      enrolled: Boolean(privilege),
      ...(privilege ? { privilege } : {}),
    }

    if (!['instructor', 'admin'].includes(String(privilege))) {
      delete result.enrollments
      result.assessments = coursePOJO.assessments?.map((assessment) => ({
        ...assessment,
        questions: assessment.questions?.map(({ correctAnswers: _correctAnswers, ...question }) => question),
      }))
    }

    return result
  })
}

courseSchema.methods.enroll = function (this: CourseDocument, userId: Types.ObjectId | string, role: string) {
  if (this.enrollments.some((entry) => entry.user.toString() === userId.toString())) {
    throw new Error('already enrolled')
  }

  let privilege: EnrollmentRole = 'student'
  if (role === 'admin') privilege = 'admin'
  if (this.createdBy && this.createdBy.toString() === userId.toString()) privilege = 'instructor'

  this.enrollments.push({ user: new Types.ObjectId(userId), enrolledAs: privilege } as EnrollmentAttrs)
  return this
}

courseSchema.methods.unEnroll = function (this: CourseDocument, userId: Types.ObjectId | string) {
  if (!this.enrollments.some((entry) => entry.user.toString() === userId.toString())) {
    throw new Error('not enrolled')
  }
  this.enrollments = this.enrollments.filter(
    (entry) => entry.user.toString() !== userId.toString()
  ) as typeof this.enrollments
  return this
}

courseSchema.methods.getInstructors = function (this: CourseDocument) {
  return this.enrollments.filter((enrollment) => enrollment.enrolledAs === 'instructor')
}

courseSchema.statics.getDeadLines = async function (courseId: Types.ObjectId | string) {
  const assessments = await Assessment.find({ course: courseId }).populate('course', 'name').exec()

  return assessments
    .map((assessment) => {
      const course = assessment.course as unknown as { name: string; _id: Types.ObjectId }
      if (assessment.type === 'Exam') {
        return {
          title: assessment.title,
          deadline: (assessment as unknown as { openAt: Date }).openAt,
          type: assessment.type,
          assessmentId: assessment._id,
          course: { name: course.name, id: course._id },
        }
      }
      if (assessment.type === 'Assignment') {
        return {
          title: assessment.title,
          deadline: (assessment as unknown as { dueDate: Date }).dueDate,
          type: assessment.type,
          assessmentId: assessment._id,
          course: { name: course.name, id: course._id },
        }
      }
      return null
    })
    .filter(Boolean)
}

courseSchema.statics.formatCalendar = function (
  deadlines: Array<{ deadline: Date; [key: string]: unknown }>
) {
  const result: Record<string, Record<string, Record<string, unknown[]>>> = {}

  deadlines.forEach((item) => {
    const date = DateTime.fromJSDate(item.deadline)
    const year = `${date.year}`
    const month = `${date.month}`
    const day = `${date.day}`

    result[year] ??= {}
    result[year][month] ??= {}
    result[year][month][day] = (result[year][month][day] ?? []).concat([item])
  })

  return result
}

export const Course = mongoose.model<CourseAttrs, CourseModelType>('Course', courseSchema)
export const CourseModule = mongoose.model('Module', courseModuleSchema)
export const CourseModuleItem = mongoose.model('CourseModuleItem', moduleItemSchema)

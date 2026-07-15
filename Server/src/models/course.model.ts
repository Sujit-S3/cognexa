import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose'
import { DateTime } from 'luxon'
import { Assessment } from './assessment.model'
import { idTransform } from '../utils/mongoTransform'

export type ModuleItemType = 'video' | 'file'

export interface ModuleItemAttrs {
  title: string
  type: ModuleItemType
  url: string
}

const moduleItemSchema = new Schema<ModuleItemAttrs>({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'file'], required: true },
  url: { type: String, required: true }
})

export interface CourseModuleAttrs {
  title: string
  moduleItems: Types.DocumentArray<ModuleItemAttrs>
}

const courseModuleSchema = new Schema<CourseModuleAttrs>({
  title: { type: String, required: true },
  moduleItems: [moduleItemSchema]
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
    enrolledAs: { type: String, enum: ['student', 'instructor', 'admin'], required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const randomHexColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16)

export interface CourseAttrs {
  name: string
  description?: string
  createdAt: Date
  createdBy: Types.ObjectId
  files: string[]
  image?: string
  backgroundColor: string
  modules: Types.DocumentArray<CourseModuleAttrs>
  status: 'published' | 'archived'
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
  getCoursesWithPrivilege(userId: Types.ObjectId | string): Promise<CoursePrivilegeView[]>
  getDeadLines(courseId: Types.ObjectId | string): Promise<Array<CourseDeadline | null>>
  formatCalendar(
    deadlines: Array<{ deadline: Date; [key: string]: unknown }>
  ): Record<string, Record<string, Record<string, unknown[]>>>
}

const courseSchema = new Schema<CourseAttrs, CourseModelType, CourseMethods>({
  name: { type: String, required: true, minlength: 1 },
  description: String,
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  files: [String],
  image: String,
  backgroundColor: { type: String, default: randomHexColor },
  modules: [courseModuleSchema],
  status: { type: String, enum: ['published', 'archived'], default: 'published' },
  enrollments: [enrollmentSchema]
})

courseSchema.set('toJSON', { transform: idTransform })

courseSchema.methods.modulesJSON = function (this: CourseDocument) {
  return { modules: this.modules.map((module) => module.toJSON()) }
}

const YOUTUBE_ID_REGEX =
  /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:-nocookie)?\.com\S*?[^\w\s-])([\w-]{11})(?=[^\w-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/i

courseSchema.methods.getVideos = function (this: CourseDocument) {
  const videos = this.modules.flatMap((module) =>
    module.moduleItems.filter((item) => item.type === 'video' && item.url.includes('youtu'))
  )

  return videos
    .map((video) => {
      const match = YOUTUBE_ID_REGEX.exec(video.url)
      if (!match) return null
      return {
        id: video._id,
        title: video.title,
        url: video.url,
        type: video.type,
        videoId: match[1]
      }
    })
    .filter(Boolean)
}

courseSchema.statics.getCoursesWithPrivilege = async function (userId: Types.ObjectId | string) {
  const courses = await this.find({}).populate(
    'enrollments.user createdBy',
    '_id name username email code photo'
  )

  return courses.map((course: CourseDocument) => {
    const coursePOJO: Record<string, unknown> & {
      enrollments?: Array<{ user: { _id: Types.ObjectId }; enrolledAs: string }>
      status: string
    } = course.toJSON() as never

    const enrollment = coursePOJO.enrollments?.find((e) => e.user._id.toString() === userId.toString())

    const result: Record<string, unknown> = { ...coursePOJO, enrolled: false }

    if (enrollment) {
      result.enrolled = true
      result.privilege = enrollment.enrolledAs
    }

    if (coursePOJO.status === 'archived') {
      result.enrolled = true
      result.privilege = 'student'
    }

    if (result.privilege === 'student') delete result.enrollments

    return result
  })
}

courseSchema.methods.enroll = function (this: CourseDocument, userId: Types.ObjectId | string, role: string) {
  if (this.enrollments.some((e) => e.user.toString() === userId.toString())) {
    throw new Error('already enrolled')
  }

  let privilege: EnrollmentRole = 'student'
  if (role === 'admin') privilege = 'admin'
  if (this.createdBy && this.createdBy.toString() === userId.toString()) privilege = 'instructor'

  this.enrollments.push({ user: new Types.ObjectId(userId), enrolledAs: privilege } as EnrollmentAttrs)
  return this
}

courseSchema.methods.unEnroll = function (this: CourseDocument, userId: Types.ObjectId | string) {
  if (!this.enrollments.some((e) => e.user.toString() === userId.toString())) {
    throw new Error('not enrolled')
  }
  this.enrollments = this.enrollments.filter(
    (e) => e.user.toString() !== userId.toString()
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
          course: { name: course.name, id: course._id }
        }
      }
      if (assessment.type === 'Assignment') {
        return {
          title: assessment.title,
          deadline: (assessment as unknown as { dueDate: Date }).dueDate,
          type: assessment.type,
          assessmentId: assessment._id,
          course: { name: course.name, id: course._id }
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

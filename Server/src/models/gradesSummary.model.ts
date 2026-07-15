import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose'
import { AssessmentDocument } from './assessment.model'
import { idTransform as toJsonTransform } from '../utils/mongoTransform'

export interface GradeAttrs {
  assessment: Types.ObjectId
  type: string
  score: number
  maxScore: number
  weight: number
  title: string
  gradedAt: Date
}

const gradeSchema = new Schema<GradeAttrs>({
  assessment: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  type: { type: String, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  weight: { type: Number, required: true },
  title: { type: String, required: true },
  gradedAt: { type: Date, required: true }
})
gradeSchema.set('toJSON', { virtuals: true, transform: toJsonTransform })
gradeSchema.set('toObject', { virtuals: true, transform: toJsonTransform })

export interface StudentGradesAttrs {
  student: Types.ObjectId
  grades: Types.DocumentArray<GradeAttrs>
}

const studentGradesSchema = new Schema<StudentGradesAttrs>({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  grades: [gradeSchema]
})

function sumWeighted(grades: Types.DocumentArray<GradeAttrs>, filterType?: string): number {
  let sum = 0
  grades.forEach((grade) => {
    if (filterType && grade.type !== filterType) return
    if (grade.score !== undefined && grade.maxScore) sum += (grade.score / grade.maxScore) * grade.weight
  })
  return Math.round(sum * 100)
}

studentGradesSchema.virtual('totalScore').get(function (this: HydratedDocument<StudentGradesAttrs>) {
  return `${sumWeighted(this.grades)}%`
})
studentGradesSchema.virtual('examsScore').get(function (this: HydratedDocument<StudentGradesAttrs>) {
  return `${sumWeighted(this.grades, 'Exam')}%`
})
studentGradesSchema.virtual('assignmentsScore').get(function (this: HydratedDocument<StudentGradesAttrs>) {
  return `${sumWeighted(this.grades, 'Assignment')}%`
})
studentGradesSchema.virtual('grade').get(function (this: { totalScore: string }) {
  const totalScoreNum = parseFloat(this.totalScore)
  if (totalScoreNum < 60) return 'F'
  if (totalScoreNum < 67) return 'D'
  if (totalScoreNum < 76) return 'C'
  if (totalScoreNum < 89) return 'B'
  return 'A'
})
studentGradesSchema.set('toJSON', { virtuals: true, transform: toJsonTransform })
studentGradesSchema.set('toObject', { virtuals: true, transform: toJsonTransform })

export interface GradesSummaryAttrs {
  course: Types.ObjectId
  studentGrades: Types.DocumentArray<StudentGradesAttrs>
}

export type GradesSummaryDocument = HydratedDocument<GradesSummaryAttrs>

export interface StudentGradeRecord {
  courseName: string
  studentName: string
  user: Types.ObjectId
  course: string
  score: string
  gradeLetter: string
}

export interface GradesSummaryModelType extends Model<GradesSummaryAttrs> {
  updateOrCreate(
    courseId: string,
    studentId: string,
    assessmentId: string,
    assessment: AssessmentDocument,
    score: number
  ): Promise<GradesSummaryDocument>
  getGradesByUser(courseId: string): Promise<StudentGradeRecord[]>
}

const gradesSummarySchema = new Schema<GradesSummaryAttrs, GradesSummaryModelType>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  studentGrades: [studentGradesSchema]
})
gradesSummarySchema.set('toJSON', { virtuals: true, transform: toJsonTransform })
gradesSummarySchema.set('toObject', { virtuals: true, transform: toJsonTransform })

gradesSummarySchema.statics.updateOrCreate = async function (
  courseId: string,
  studentId: string,
  assessmentId: string,
  assessment: AssessmentDocument,
  score: number
) {
  let parent = await this.findOne({ course: courseId })
  if (!parent) parent = await this.create({ course: courseId })

  let studentGrades = parent.studentGrades.id(studentId)
  if (!studentGrades) {
    parent.studentGrades.push({ _id: studentId, student: studentId, grades: [] } as never)
    studentGrades = parent.studentGrades.id(studentId)
  }

  const grade = studentGrades!.grades.id(assessmentId)
  const gradeAttrs = {
    assessment: assessmentId,
    score,
    weight: assessment.weight,
    maxScore: assessment.maxScore,
    type: assessment.type,
    title: assessment.title,
    gradedAt: new Date()
  }

  if (!grade) {
    studentGrades!.grades.push({ _id: assessmentId, ...gradeAttrs } as never)
  } else {
    Object.assign(grade, gradeAttrs)
  }

  return parent.save()
}

gradesSummarySchema.statics.getGradesByUser = async function (courseId: string) {
  const result: Array<{
    courseName: string
    studentName: string
    user: Types.ObjectId
    course: string
    score: string
    gradeLetter: string
  }> = []

  const courseGrades = await this.findOne({ course: courseId })
    .populate({ path: 'studentGrades.student', model: 'User' })
    .populate('course', 'name')
    .exec()

  if (!courseGrades) return result

  const json = courseGrades.toJSON() as unknown as {
    course: { name: string; id: string }
    studentGrades: Array<{
      student: { name: string; _id: Types.ObjectId }
      totalScore: string
      grade: string
    }>
  }

  for (const userGrade of json.studentGrades) {
    result.push({
      courseName: json.course.name,
      studentName: userGrade.student.name,
      user: userGrade.student._id,
      course: json.course.id,
      score: userGrade.totalScore,
      gradeLetter: userGrade.grade
    })
  }

  return result
}

export const GradesSummary = mongoose.model<GradesSummaryAttrs, GradesSummaryModelType>(
  'GradesSummary',
  gradesSummarySchema
)

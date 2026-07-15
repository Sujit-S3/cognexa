import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export type UserRole = 'admin' | 'student' | 'instructor'

export interface UserAttrs {
  username: string
  name: string
  email: string
  photo: string
  password: string
  passwordConfirm?: string
  passwordChangedAt: Date
  passwordResetToken?: string
  passwordResetValidity?: Date
  isActive: boolean
  lastSeenAt: Date
  code: number
  mobile: string
  invalidatedTokens: string[]
  role: UserRole
  enrollments: Types.ObjectId[]
  isEmailRegistered: boolean
}

export interface UserMethods {
  generateAuthToken(): Promise<string>
}

interface UserModel extends Model<UserAttrs, unknown, UserMethods> {
  findByCredentials(email: string, password: string): Promise<HydratedDocument<UserAttrs, UserMethods>>
}

export type UserDocument = HydratedDocument<UserAttrs, UserMethods>

const userSchema = new Schema<UserAttrs, UserModel, UserMethods>({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (value: string) => validator.isEmail(value),
      message: 'Email is invalid'
    }
  },
  photo: { type: String, default: 'https://www.w3schools.com/howto/img_avatar.png' },
  password: {
    type: String,
    required: true,
    minlength: 8,
    trim: true,
    validate: {
      validator: (value: string) => !value.toLowerCase().includes('password'),
      message: 'Password cannot contain "password"'
    }
  },
  passwordChangedAt: { type: Date, default: Date.now, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetValidity: { type: Date, select: false },
  isActive: { type: Boolean, default: true },
  lastSeenAt: { type: Date, default: () => new Date(0) },
  code: { type: Number },
  mobile: {
    type: String,
    required: [true, 'User phone number required'],
    validate: {
      validator: (value: string) => /\d{3}-\d{3}-\d{4}/.test(value),
      message: (props: { value: string }) => `${props.value} is not a valid phone number!`
    }
  },
  invalidatedTokens: [String],
  role: { type: String, enum: ['admin', 'student', 'instructor'], default: 'student' },
  enrollments: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  isEmailRegistered: { type: Boolean, default: false }
})

userSchema.index({ name: 1, username: 1 })

userSchema.virtual('followers', { ref: 'Follow', foreignField: 'follows', localField: '_id' })
userSchema.virtual('followersCount', {
  ref: 'Follow',
  foreignField: 'follows',
  localField: '_id',
  count: true
})
userSchema.virtual('follows', { ref: 'Follow', foreignField: 'user', localField: '_id' })
userSchema.virtual('followCount', { ref: 'Follow', foreignField: 'user', localField: '_id', count: true })
userSchema.virtual('articles', { ref: 'Article', foreignField: 'authorPersonId', localField: '_id' })
userSchema.virtual('articlesCount', {
  ref: 'Article',
  foreignField: 'authorPersonId',
  localField: '_id',
  count: true
})

userSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    delete ret.password
    delete ret.passwordConfirm
    delete ret.invalidatedTokens
    delete ret.passwordResetToken
    delete ret.passwordResetValidity
    delete ret.__v
    return ret
  }
})

userSchema.methods.generateAuthToken = async function (this: UserDocument) {
  return jwt.sign({ _id: this._id.toString() }, env.SECRET_KEY, {
    expiresIn: env.JWT_EXPIRES_IN_SECONDS
  })
}

userSchema.statics.findByCredentials = async function (email: string, password: string) {
  const user = await this.findOne({ email })
  if (!user) throw new Error('Unable to login')

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new Error('Unable to login')

  return user
}

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

export const User = mongoose.model<UserAttrs, UserModel>('User', userSchema)

import mongoose, { Schema, Types } from 'mongoose'

export interface CheatingBatchCountAttrs {
  student: Types.ObjectId
  counter: number
}

const cheatingBatchCountSchema = new Schema<CheatingBatchCountAttrs>({
  // NOTE: original schema had `ref: "user"` (lowercase) which silently broke populate — fixed to 'User'.
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  counter: { type: Number, default: 1 }
})

export const CheatingBatchCount = mongoose.model('CheatingBatchCount', cheatingBatchCountSchema)

import mongoose, { Schema, Types } from 'mongoose'

export interface ArticleAttrs {
  authorPersonId: Types.ObjectId
  text?: string
  title: string
  lang: 'en' | 'fr' | 'sp' | 'ar'
  contentType: string
  url?: string
  contentId: number
}

const articleSchema = new Schema<ArticleAttrs>(
  {
    authorPersonId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    title: { type: String, required: true },
    lang: { type: String, required: true, enum: ['en', 'fr', 'sp', 'ar'], default: 'en' },
    contentType: { type: String, default: 'html' },
    url: { type: String },
    contentId: { type: Number, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
)

// NOTE: original schema defined the `likers` virtual twice (second definition silently shadowed
// the first). Kept a single, correct count virtual.
articleSchema.virtual('likersCount', { ref: 'Like', foreignField: 'article', localField: '_id', count: true })

export const Article = mongoose.model('Article', articleSchema)

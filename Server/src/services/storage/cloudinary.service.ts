import { createHash } from 'node:crypto'
import { env, isCloudinaryConfigured } from '../../config/env'
import { AppError } from '../../utils/AppError'

export type CloudinaryResourceType = 'image' | 'video' | 'raw'

interface CreateUploadSignatureInput {
  courseId: string
  purpose: string
  resourceType: CloudinaryResourceType
}

export interface CloudinaryUploadSignature {
  uploadUrl: string
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
  resourceType: CloudinaryResourceType
}

export function signCloudinaryParameters(
  parameters: Record<string, string | number>,
  apiSecret: string
): string {
  const canonical = Object.entries(parameters)
    .filter(([, value]) => value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  return createHash('sha1').update(`${canonical}${apiSecret}`).digest('hex')
}

export function createCloudinaryUploadSignature({
  courseId,
  purpose,
  resourceType,
}: CreateUploadSignatureInput): CloudinaryUploadSignature {
  if (
    !isCloudinaryConfigured ||
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError(503, 'Course media uploads are not configured')
  }

  const timestamp = Math.floor(Date.now() / 1_000)
  const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/courses/${courseId}/${purpose}`
  const signature = signCloudinaryParameters({ folder, timestamp }, env.CLOUDINARY_API_SECRET)

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    resourceType,
  }
}

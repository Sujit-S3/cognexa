import { instructorApi, type CloudinaryUploadSignature, type UploadedAssetView } from '../../services/api'

export type UploadPurpose = 'thumbnail' | 'banner' | 'lesson-video' | 'lesson-file' | 'assignment-file'

interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  resource_type: 'image' | 'video' | 'raw'
  format?: string
  bytes?: number
  original_filename?: string
}

const limits: Record<CloudinaryUploadSignature['resourceType'], number> = {
  image: 10 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  raw: 100 * 1024 * 1024,
}

function videoThumbnailUrl(url: string): string {
  return url.replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto/')
}

function sendToCloudinary(
  file: File,
  signature: CloudinaryUploadSignature,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const body = new FormData()
    body.append('file', file)
    body.append('api_key', signature.apiKey)
    body.append('timestamp', String(signature.timestamp))
    body.append('signature', signature.signature)
    body.append('folder', signature.folder)

    xhr.open('POST', signature.uploadUrl)
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResponse)
        return
      }
      try {
        const response = JSON.parse(xhr.responseText) as { error?: { message?: string } }
        reject(new Error(response.error?.message || 'Cloudinary rejected the upload'))
      } catch {
        reject(new Error('Cloudinary rejected the upload'))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed. Check your connection and retry.')))
    xhr.addEventListener('abort', () => reject(new DOMException('Upload cancelled', 'AbortError')))

    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(body)
  })
}

export async function uploadCourseAsset({
  courseId,
  file,
  purpose,
  resourceType,
  onProgress,
  signal,
}: {
  courseId: string
  file: File
  purpose: UploadPurpose
  resourceType: CloudinaryUploadSignature['resourceType']
  onProgress: (progress: number) => void
  signal?: AbortSignal
}): Promise<UploadedAssetView> {
  if (file.size > limits[resourceType]) {
    throw new Error(
      `${resourceType === 'video' ? 'Video' : 'File'} exceeds the ${Math.round(limits[resourceType] / 1024 / 1024)} MB limit`
    )
  }

  const signature = await instructorApi.createUploadSignature({
    courseId,
    purpose,
    resourceType,
    originalName: file.name,
  })
  const result = await sendToCloudinary(file, signature, onProgress, signal)

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    originalName: file.name,
    thumbnailUrl: result.resource_type === 'video' ? videoThumbnailUrl(result.secure_url) : undefined,
  }
}

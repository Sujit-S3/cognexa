import { useEffect, useId, useRef, useState } from 'react'
import type { UploadedAssetView } from '../../services/api'
import { Button } from '../../design'
import { uploadCourseAsset, type UploadPurpose } from './upload.service'
import styles from './InstructorWorkspace.module.css'

interface UploadFieldProps {
  courseId: string
  label: string
  help: string
  purpose: UploadPurpose
  resourceType: 'image' | 'video' | 'raw'
  accept: string
  value?: UploadedAssetView
  onUploaded: (asset: UploadedAssetView) => void
  onRemove?: () => void
}

export function UploadField({
  courseId,
  label,
  help,
  purpose,
  resourceType,
  accept,
  value,
  onUploaded,
  onRemove,
}: UploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const abortRef = useRef<AbortController | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const startUpload = async (selectedFile: File) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setFile(selectedFile)
    setProgress(0)
    setStatus('uploading')
    setError(null)

    try {
      const asset = await uploadCourseAsset({
        courseId,
        file: selectedFile,
        purpose,
        resourceType,
        onProgress: setProgress,
        signal: controller.signal,
      })
      onUploaded(asset)
      setProgress(100)
      setStatus('idle')
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === 'AbortError') {
        setStatus('idle')
        setError('Upload cancelled')
        return
      }
      setStatus('error')
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
    }
  }

  const previewUrl = value?.thumbnailUrl ?? (resourceType === 'image' ? value?.url : undefined)

  return (
    <div className={styles.uploadField}>
      <div className={styles.fieldHeading}>
        <div>
          <label className={styles.label} htmlFor={inputId}>
            {label}
          </label>
          <p className={styles.helpText}>{help}</p>
        </div>
        {value && onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      {previewUrl ? (
        <img className={styles.uploadPreview} src={previewUrl} alt={`${label} preview`} />
      ) : value ? (
        <div className={styles.filePreview}>
          <span aria-hidden="true">↗</span>
          <span>{value.originalName ?? 'Uploaded file'}</span>
        </div>
      ) : null}

      <input
        ref={inputRef}
        id={inputId}
        className={styles.visuallyHidden}
        type="file"
        accept={accept}
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected) void startUpload(selected)
          event.target.value = ''
        }}
      />

      <div className={styles.uploadActions}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={status === 'uploading'}
          onClick={() => inputRef.current?.click()}
        >
          {value ? 'Replace file' : 'Choose file'}
        </Button>
        {status === 'uploading' && (
          <Button type="button" variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
            Cancel
          </Button>
        )}
        {status === 'error' && file && (
          <Button type="button" variant="ghost" size="sm" onClick={() => void startUpload(file)}>
            Retry
          </Button>
        )}
      </div>

      {status === 'uploading' && (
        <div
          className={styles.uploadProgress}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
          <small>{progress}% uploaded</small>
        </div>
      )}
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

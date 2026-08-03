import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { certificatesApi } from '../../services/api'
import { GlassCard, Badge, Button } from '../../design'
import { BrandLogo } from '../../components/brand/BrandLogo'
import styles from './VerifyCertificatePage.module.css'

export function VerifyCertificatePage() {
  const { code = '' } = useParams<{ code: string }>()
  const [searchCode, setSearchCode] = useState(code)

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => certificatesApi.verify(code),
    enabled: Boolean(code),
    retry: false,
  })

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.logoLink}>
        <BrandLogo />
      </Link>

      <GlassCard elevation="raised" style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
        <Badge tone="cyan">Certificate verification</Badge>
        <h1 className={styles.title}>Verify a Cognexa certificate</h1>
        <p className={styles.description}>
          Enter the verification code printed on a Cognexa certificate to confirm it is genuine.
        </p>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            window.location.href = `/certificates/verify/${encodeURIComponent(searchCode.trim())}`
          }}
        >
          <input
            type="text"
            className={styles.input}
            placeholder="CGX-XXXXXXX-XXXXXX"
            value={searchCode}
            onChange={(event) => setSearchCode(event.target.value)}
            aria-label="Certificate verification code"
          />
          <Button type="submit" magnetic>
            Verify
          </Button>
        </form>

        {isLoading && (
          <p role="status" style={{ color: 'var(--nx-fg-muted)', marginTop: '20px' }}>
            Checking...
          </p>
        )}

        {isFetched && data && (
          <div className={styles.result} role="status">
            {data.valid ? (
              <>
                <Badge tone="success">Valid certificate</Badge>
                <dl className={styles.detailList}>
                  <div>
                    <dt>Learner</dt>
                    <dd>{data.learnerName}</dd>
                  </div>
                  <div>
                    <dt>Course</dt>
                    <dd>{data.courseName}</dd>
                  </div>
                  <div>
                    <dt>Grade</dt>
                    <dd>{data.gradeLetter}</dd>
                  </div>
                  <div>
                    <dt>Completed</dt>
                    <dd>{data.finishedAt ? new Date(data.finishedAt).toLocaleDateString() : '—'}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <Badge tone="pink">No certificate found for this code</Badge>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  )
}

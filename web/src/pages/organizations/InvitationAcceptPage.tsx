import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { invitationsApi } from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import { BrandLogo } from '../../components/brand/BrandLogo'
import { useAuthStore } from '../../stores/authStore'
import styles from './InvitationAcceptPage.module.css'

export function InvitationAcceptPage() {
  const { token = '' } = useParams<{ token: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()

  const invitationQuery = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationsApi.getByToken(token),
    enabled: Boolean(token),
    retry: false,
  })

  const acceptMutation = useMutation({
    mutationFn: () => invitationsApi.accept(token),
    onSuccess: (org) => navigate(`/organizations/${org.id}`),
  })

  return (
    <div className={styles.container}>
      <Link to="/" className={styles.logoLink}>
        <BrandLogo />
      </Link>

      <GlassCard elevation="raised" style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
        <Badge tone="cyan">Organization invitation</Badge>

        {invitationQuery.isLoading && (
          <p role="status" className={styles.description}>
            Loading invitation…
          </p>
        )}

        {invitationQuery.isError && (
          <>
            <h1 className={styles.title}>Invitation not found</h1>
            <p role="alert" className={styles.description}>
              This invitation link is invalid or has been removed.
            </p>
          </>
        )}

        {invitationQuery.data && (
          <>
            <h1 className={styles.title}>Join {invitationQuery.data.organization.name}</h1>
            <p className={styles.description}>
              You've been invited to join <strong>{invitationQuery.data.organization.name}</strong> as{' '}
              {invitationQuery.data.role} at <strong>{invitationQuery.data.email}</strong>.
            </p>

            {invitationQuery.data.status !== 'pending' && (
              <p role="alert" className={styles.warning}>
                This invitation is {invitationQuery.data.status} and can no longer be accepted.
              </p>
            )}

            {invitationQuery.data.status === 'pending' && !isAuthenticated && (
              <Button
                magnetic
                glow
                style={{ marginTop: '20px' }}
                onClick={() => navigate('/auth/login', { state: { from: location } })}
              >
                Sign in to accept
              </Button>
            )}

            {invitationQuery.data.status === 'pending' &&
              isAuthenticated &&
              user?.email !== invitationQuery.data.email && (
                <p role="alert" className={styles.warning}>
                  You're signed in as {user?.email}. Sign in with {invitationQuery.data.email} to accept this
                  invitation.
                </p>
              )}

            {invitationQuery.data.status === 'pending' &&
              isAuthenticated &&
              user?.email === invitationQuery.data.email && (
                <Button
                  magnetic
                  glow
                  style={{ marginTop: '20px' }}
                  disabled={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate()}
                >
                  {acceptMutation.isPending ? 'Accepting…' : 'Accept invitation'}
                </Button>
              )}

            {acceptMutation.isError && (
              <p role="alert" className={styles.warning}>
                {acceptMutation.error instanceof Error
                  ? acceptMutation.error.message
                  : 'Could not accept the invitation.'}
              </p>
            )}
          </>
        )}
      </GlassCard>
    </div>
  )
}

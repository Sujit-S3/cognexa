import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Building2, Plus } from 'lucide-react'
import { organizationsApi } from '../../services/api'
import { Badge, Button, GlassCard } from '../../design'
import styles from './OrganizationsListPage.module.css'

export function OrganizationsListPage() {
  const [name, setName] = useState('')
  const queryClient = useQueryClient()

  const orgsQuery = useQuery({ queryKey: ['organizations', 'mine'], queryFn: organizationsApi.listMine })

  const createOrg = useMutation({
    mutationFn: (orgName: string) => organizationsApi.create(orgName),
    onSuccess: () => {
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['organizations', 'mine'] })
    },
  })

  return (
    <div className={styles.container}>
      <GlassCard elevation="raised" glow className={styles.headerBanner}>
        <div>
          <Badge tone="cyan">
            <Building2 size={13} /> Organizations
          </Badge>
          <h1>Your organizations</h1>
          <p>Invite a team, assign published courses, and monitor completion across your organization.</p>
        </div>
        <form
          className={styles.createForm}
          onSubmit={(event) => {
            event.preventDefault()
            if (name.trim()) createOrg.mutate(name.trim())
          }}
        >
          <input
            type="text"
            placeholder="Organization name"
            aria-label="New organization name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button type="submit" magnetic leftIcon={<Plus size={16} />} disabled={createOrg.isPending}>
            {createOrg.isPending ? 'Creating…' : 'Create organization'}
          </Button>
        </form>
      </GlassCard>

      {orgsQuery.isLoading && (
        <div className={styles.panelLoading} role="status">
          Loading organizations…
        </div>
      )}

      {orgsQuery.isError && (
        <GlassCard className={styles.errorState}>
          <h2>Could not load your organizations</h2>
          <Button type="button" onClick={() => void orgsQuery.refetch()}>
            Try again
          </Button>
        </GlassCard>
      )}

      {orgsQuery.data && orgsQuery.data.length === 0 && (
        <GlassCard className={styles.emptyState}>
          <Building2 size={28} />
          <h3>No organizations yet</h3>
          <p>Create one to start inviting a team and assigning them courses.</p>
        </GlassCard>
      )}

      {orgsQuery.data && orgsQuery.data.length > 0 && (
        <div className={styles.orgsGrid}>
          {orgsQuery.data.map((org) => (
            <GlassCard key={org.id} interactive className={styles.orgCard}>
              <h3>{org.name}</h3>
              <p>
                {org.members.length} member{org.members.length === 1 ? '' : 's'}
              </p>
              <Link to={`/organizations/${org.id}`}>
                Open <ArrowRight size={15} />
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

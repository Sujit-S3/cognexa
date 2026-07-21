# Operations Manual

## Daily checks

- API and web availability, SLO burn, p95 latency, 5xx rate, and Core Web Vitals.
- MongoDB connections, replication, storage, slow queries, and backup freshness.
- Redis availability, memory, rejected connections, and eviction count.
- Deployment replica health, restarts, CPU throttling, memory, and pending pods.
- Trace export, structured-log ingestion, certificate expiry, and unresolved alerts.

## Health and diagnostics

| Endpoint               | Purpose                                                | Public exposure                   |
| ---------------------- | ------------------------------------------------------ | --------------------------------- |
| `/health/live`         | Process liveness, version, commit, and uptime          | Load balancer and operators       |
| `/health/startup`      | Startup probe                                          | Cluster only                      |
| `/health/ready`        | Required MongoDB and Redis readiness                   | Load balancer and operators       |
| `/health/dependencies` | Required and optional provider-neutral dependency view | Operators; restrict at the edge   |
| `/metrics`             | Prometheus metrics                                     | Bearer protected and cluster-only |

Every API response receives `x-request-id`. Search structured logs and OTLP traces with that value before widening an incident query.

## Routine release operation

1. Confirm CI, browser tests, dependency audit, container scan, and migration validation.
2. Create a semantic `vX.Y.Z` tag. The release workflow publishes multi-architecture, SBOM-attested images and records their digests.
3. Verify backup freshness and a recent restore drill.
4. Run `Deploy Immutable Release` for staging with the two digests and commit SHA.
5. Observe staging, then use the protected production environment approval.
6. Record Kubernetes revision numbers, image digests, change owner, and smoke result.

## Database operation

Migrations are additive and checksum protected:

```bash
pnpm db:migrate:validate
pnpm db:migrate:status
pnpm db:migrate
```

Do not edit a migration after it has been applied. The current critical-index migration has no destructive down migration; a code rollback retains compatible indexes.

Backups use MongoDB Database Tools available on the operator host:

```bash
pnpm db:backup -- /secure/path/cognexa.archive.gz
pnpm db:backup:verify -- /secure/path/cognexa.archive.gz
```

The archive is compressed, not application-encrypted. Store it only in an encrypted bucket with restricted IAM and retention controls.

## Capacity and maintenance

Run load tests before changing HPA maximums or database pool sizes. Drain nodes through disruption budgets, one failure domain at a time. For provider maintenance, keep optional dependencies degraded rather than removing API readiness; required MongoDB or Redis failure removes the replica from traffic.

# Deployment Guide

## Environments

Use isolated development, preview, staging, and production environments. Each has distinct databases, object buckets, provider credentials, signing secrets, domains, queues, and analytics projects. Production data and secrets never flow into previews.

Recommended initial topology:

- Web: immutable static assets behind a CDN/WAF on `app.cognexa.app`.
- API: two or more stateless replicas on `api.cognexa.app` in one highly available region.
- Data: managed MongoDB replica set with point-in-time recovery.
- Files/video: private object storage plus a managed streaming provider/CDN.
- Jobs/limits: managed Redis and durable workers when those modules ship.
- Secrets: cloud secret manager injected at runtime.

Keep web and API under the same registrable site so `SameSite=Lax` refresh cookies work without weakening to cross-site cookies. Set `COOKIE_DOMAIN=.cognexa.app`, API CORS to the exact web origins, and `Secure` cookies through `NODE_ENV=production`.

## Build and configuration

CI builds from `pnpm-lock.yaml` with Node 22 and publishes immutable image digests. The frontend API URL is a build argument; all credentials are server runtime values.

Required API values: `MONGODB_ATLAS_URI`, a random `SECRET_KEY` of at least 32 characters, exact `CORS_ALLOWED_ORIGINS`, and correct public `CLIENT_URL`. Optional email, push, and AI values enable their integrations. See `Server/.env.example`.

Never place a secret in a variable prefixed `VITE_`; Vite embeds those values in public browser assets.

Environment contracts and validation commands are defined in [ENVIRONMENTS.md](ENVIRONMENTS.md). The Kubernetes reference deployment, provider prerequisites, and security boundaries are defined in [INFRASTRUCTURE.md](INFRASTRUCTURE.md).

## Release sequence

1. Approve the change, threat/data review, OpenAPI compatibility, and release notes.
2. Run quality, container, dependency, secret, and infrastructure policy gates.
3. Back up and verify restore status; apply additive indexes/migrations with bounded impact.
4. Deploy API workers and API replicas with no traffic; pass readiness and smoke checks.
5. Shift a small traffic percentage and watch error, latency, database, queue, and business SLIs.
6. Deploy web assets and purge only non-hashed documents.
7. Enable feature flags for internal users, then cohorts, then general availability.
8. Confirm analytics, audit events, alerts, and support readiness; record the release.

Backward-compatible expand/migrate/contract changes are mandatory when a rolling deployment can mix versions.

## Health and rollback

- `/health/live` confirms the process is responsive and reports version/commit.
- `/health/ready` returns 200 only when MongoDB is connected; load balancers remove 503 replicas.
- `/health/startup` is the slow-start gate, `/health/dependencies` reports required and optional providers, and bearer-protected `/metrics` supports Prometheus scraping.
- Rollback re-points traffic to the previous image digest and previous compatible web release.
- Destructive migrations require a restore/reconciliation procedure and are never coupled to a same-step application deployment.
- Feature flags provide the fastest rollback for high-risk user-facing behavior but do not replace code rollback.

## Backups and recovery

- Managed continuous MongoDB backup with daily restore verification in a non-production account.
- Object versioning and lifecycle policies; cross-account copy for critical customer assets.
- Infrastructure/configuration and index definitions stored in version control.
- Initial targets pending business approval: RPO 15 minutes, RTO 2 hours for the learning core.
- Quarterly restore drill; annual regional-loss exercise after enterprise launch.

## Monitoring and alerts

Page on user-impacting SLO burn, elevated 5xx, readiness loss, database saturation, queue age, failed payment webhooks, or authentication anomaly. Ticket on storage growth, certificate expiry, dependency risk, slow-query regression, and feature-flag expiry. Every page has an owner, severity, diagnosis steps, mitigation, and rollback link.

Repository monitoring resources live in `deploy/observability`; installation and provider integrations remain environment operations. See [MONITORING.md](MONITORING.md) and `docs/runbooks/`.

## Automated release path

1. A protected semantic tag runs `Release Images`, producing multi-architecture digest-addressed images, SBOM/provenance attestations, and generated release notes.
2. An operator promotes the same digests through protected staging and production environments using `Deploy Immutable Release`.
3. The workflow validates inputs/manifests, applies additive migrations, waits for zero-unavailable rolling updates, and runs external smoke checks.
4. A failed rollout attempts undo. The separate protected rollback workflow restores known-good web/API revisions and verifies the expected commit.

See [RELEASES.md](RELEASES.md) for required GitHub environment configuration and [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) for manual cloud work and known gaps.

## Sites hosting note

The current application is an existing two-service Vite/Express product with MongoDB and app-owned public authentication. It is not a single Sites worker and cannot be safely published as a static-only site without losing the API, database, and session model. Use the container topology above or a platform that supports the two services and managed MongoDB. A future marketing-only surface can be hosted independently on Sites.

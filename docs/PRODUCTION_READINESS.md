# Production Readiness

## Implemented in this repository

- Strict deployed-environment validation and isolated environment examples.
- Multi-stage non-root API and web images with health checks and OCI release labels.
- Local Compose with MongoDB and Redis health dependencies.
- Startup, liveness, readiness, dependency, and protected metrics endpoints.
- Distributed Redis rate limiting, structured request logging, correlation IDs, Prometheus metrics, and optional OpenTelemetry traces.
- Checksum-protected additive migration runner and backup archive verification scripts.
- Kubernetes base and staging/production overlays with rolling updates, probes, resources, restricted pod security, disruption budgets, ingress, TLS references, and HPA.
- CI quality, E2E, dependency, secret, CodeQL, container, and manifest gates.
- Digest-pinned release, deploy, smoke verification, and rollback workflows.
- Prometheus rules, ServiceMonitor, Grafana dashboard, operations guides, and incident runbooks.
- SEO metadata, structured organization data, manifest, cache-safe service worker, and immutable static asset caching.

## Manual cloud configuration required

- GitHub environment protection, cloud credentials, registry access, and branch/tag protection.
- DNS, Cloudflare CDN/WAF, TLS issuer, ingress controller, and certificate monitoring.
- MongoDB Atlas networking/users/backups/restore alerts and managed Redis with TLS/no eviction.
- External secrets, OTLP collector, log/error platforms, Prometheus/Grafana/Alertmanager, and provider exporters.
- Cloudinary, SMTP, and AI gateway accounts where enabled.
- Staging and production deploys, backup restore drill, load test, penetration review, browser/accessibility audit, and final go-live approval.

## Known operational gaps

- Durable background workers, retry/dead-letter queues, queue dashboards, and queue-based AI/media/report/certificate work are not implemented. Redis currently provides distributed rate-limit state only.
- MongoDB durable refresh sessions remain authoritative; moving sessions to Redis is neither required nor implemented.
- No live cloud, DNS, TLS, container, Kubernetes, Lighthouse, load, backup-tool, or restore test can be claimed from a workstation without those providers and CLIs.
- Multi-region failover is intentionally deferred until business-approved RTO/RPO and data-consistency requirements justify it.
- Automated preview hosting is provider-dependent; staging promotion is automated after protected workflow dispatch.
- Automated coverage is 23.1% statements for the web application and 66.9% statements for the API (unit/integration only — the web number does not include the separate Playwright E2E suite, which exercises the learner/instructor/admin/organization critical paths end-to-end against a mocked network). Accessibility, load, penetration, and restore suites are not release-complete.
- Commerce (billing/entitlements) is not implemented. Learner playback/progress, assessment delivery/submission/grading, certificates, notifications, an administration console, and organization tenancy (invitations, roles, assign-learning, audit logs) are implemented and covered by integration and E2E tests, but have not been exercised against a live production deployment — see the manual cloud work above.

These gaps block a public production v1.0.0 release and any claim of completed production deployment. The repository is a release candidate for its narrower supported surface (everything except commerce), not an approved production launch — the code is deploy-ready, the infrastructure/operational surface it deploys into is not yet provisioned.

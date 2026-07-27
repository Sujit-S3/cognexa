# Cognexa v1.0.0 Final Release Audit

Audit date: 2026-07-27  
Audited runtime: `web/` and `Server/src/`  
Release state: prepared release candidate; not tagged or deployed

## Executive decision and scores

| Area                 |  Score |
| -------------------- | -----: |
| Repository health    | 82/100 |
| Production readiness | 68/100 |
| Security             | 86/100 |
| Performance          | 76/100 |
| Documentation        | 90/100 |
| Testing              | 52/100 |
| CI/CD                | 95/100 |

**Recommendation: No-Go for a public v1.0.0 production release.** The source and delivery controls are materially stronger and the named CI failures are corrected, but automated coverage, production-like integration evidence, learner-core completeness, cloud staging, restore, load, accessibility, and penetration evidence do not meet an enterprise launch bar.

## Failing workflow investigation

| Workflow              | Root cause                                                                                                                                                                                        | Fix                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CI / containers`     | Frozen pnpm workspace installs were given only one workspace manifest, so the lockfile importer set could not be validated. Later failures came from bundled npm/tar and Alpine OpenSSL findings. | Both package manifests are copied before frozen installs; npm is removed from the API runtime; Alpine packages are upgraded; image source/version labels are correct; Trivy fails on critical findings without `.trivyignore` or `--ignore-unfixed`. |
| `CI / infrastructure` | Kustomize namespace transformation made staging patches fail to match base resources; the prior client dry-run also conflated render validation with cluster schema validation.                   | Overlay and patch namespaces are aligned, both overlays render, and a repository validator parses all YAML and checks required resources, image/user/health contracts, release versions, and anti-bypass policies.                                   |
| `CI / secret-scan`    | The shared dummy test signing value matched Gitleaks in workflow/test environment files. The first remediation excluded entire workflows, tests, and example paths, which could hide real leaks.  | Gitleaks now scans history with no path/commit exclusions and permits only the exact non-secret test value.                                                                                                                                          |

## Defects fixed during the enterprise audit

- Authentication: atomic refresh rotation; all stale sessions revoked on password reset/change; fresh session issued after an authenticated password change.
- Authorization: unpublished courses cannot be self-enrolled without course-management authority.
- Validation: strict bounded schemas protect course, module, module-item, enrollment, profile, phone, and lecture-comment inputs; optional credential groups must be complete.
- AI: provider/user HTML is escaped before Markdown rendering; deployed AI cannot silently fall back to a mock provider while enabled.
- Product integrity: active screens use persisted API data only. Demo submissions, grading, progress, certificates, notifications, and admin changes were removed; route shapes return explicit unavailable states.
- Data/performance: additive indexes cover password recovery, deadlines, instructor activity, submissions, grades, comments, and achievements.
- Code health: duplicate route guard, disconnected modern-source social/notification/grading models/services, and unused dependencies were removed. The frozen legacy tree remains by architectural decision.
- Release engineering: all package/image/Kubernetes/OpenAPI versions align at `1.0.0`; deploy input validation and mutable tag replacement are release-safe.
- API documentation: the OpenAPI contract now covers every supported versioned route, matches implemented response semantics, resolves all local references, and is guarded by the infrastructure CI validator.
- Dependencies: routine Dependabot version updates are restricted to patch releases for the v1 release branch; security updates remain enabled and are not filtered by the version-update policy.

## Files changed

- CI/security: `.github/workflows/{ci,deploy,release}.yml`, `.gitleaks.toml`, `.trivyignore` (removed), `scripts/validate-{env,infrastructure}.mjs`.
- Containers/infrastructure: `docker/*.Dockerfile`, `deploy/k8s/base/*`, `deploy/observability/prometheus-rules.yaml`, environment examples.
- API/auth/data: `Server/src/modules/{auth,courses,lectures}`, `Server/src/services/session.service.ts`, supported models, migrations, and regression tests.
- Web: `App.tsx`, header/shell/auth routing, catalog/detail/dashboard/AI pages and tests; demo-only learner/assessment/admin/notification/certificate components removed.
- Dependencies/versioning: root, server, web package manifests, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.
- Documentation: README, architecture/environment/deployment/infrastructure/security/testing/readiness guides, capability matrix, changelog, release notes, and this audit.

## Verification performed

- Frozen pnpm install completed.
- Frontend and API TypeScript compilation passed.
- Automated tests passed: 15 web tests and 35 API tests.
- Coverage measured: web 10.8% statements/11.29% lines; API 36.04% statements/38.54% lines.
- Both staging and production Kubernetes overlays rendered with Kubernetes 1.31 `kubectl`.
- Infrastructure policy validator parsed 27 YAML files and validated both runtime image contracts.
- OpenAPI route coverage and local component references passed the infrastructure contract gate.
- Gitleaks scanned the full Git history with no detected leaks.
- Dependency audit: zero critical/high, three moderate advisories.
- License inventory completed; no AGPL dependency found. One development-only Sharp binary includes LGPL-3.0-or-later obligations.
- Dead-code analysis found no additional reachable production-source cycles; reported legacy files are intentionally frozen references.
- Playwright passed both instructor authoring journeys on a dedicated local port.

Docker image builds/Trivy scans, GitHub-hosted E2E, and CodeQL are verified by the post-push workflows, not by this Windows workstation, which has no Docker runtime.

## Remaining risks and known limitations

1. Automated test depth is below release policy, especially controllers, models, auth authorization branches, and learner UI.
2. There is no database-backed integration harness using disposable MongoDB/Redis.
3. Learner playback/progress, assessment delivery/submission/grading, certificates, general notifications, admin governance, commerce, organizations, and audit-event UI are not supported.
4. React Router has three moderate advisories without a compatible published v6 patch; risk acceptance and upgrade tracking are required.
5. Large instructor components remain refactoring candidates, but splitting them in a final hardening phase would add regression risk without user value.
6. No live latency, memory, Lighthouse/Core Web Vitals, load, failover, penetration, or assistive-technology measurements exist.
7. Legacy `Client/` and JavaScript server references remain in the repository and must be excluded from deployment and future feature work.

## Manual infrastructure tasks

1. Enforce branch and signed/protected tag rules plus required CI/CodeQL checks.
2. Configure protected staging/production GitHub environments and least-privilege cluster credentials.
3. Provision and validate Atlas backups/private access, managed Redis TLS/no-eviction, DNS, WAF/CDN, ingress, TLS, external secrets, Cloudinary, SMTP, AI gateway, OTLP, logs, metrics, alerts, and exporters.
4. Build and scan release images, retain SBOM/provenance, deploy immutable digests to staging, and execute smoke tests.
5. Complete database restore, rollback, load, accessibility, browser, and penetration drills with retained evidence.
6. Obtain product/legal decisions for learner age, privacy/retention, AI disclosure, accessibility, support, RPO/RTO, and Sharp/LGPL notices.

## Go criteria

Public production can be reconsidered only after critical learner capabilities are either implemented and tested or explicitly removed from the v1 product promise; coverage includes database-backed auth/enrollment/authoring journeys; all hosted workflows are green on the release commit; staging, restore, load, accessibility, security, and rollback evidence is approved; and all manual provider/operational tasks have named owners.

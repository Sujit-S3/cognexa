# Testing Strategy

## Test pyramid

1. Domain unit tests: grading rules, access policies, progress calculations, entitlement rules, scheduling, and AI safety transforms.
2. API integration tests: validation, authentication, ownership, database invariants, idempotency, pagination, errors, and side-effect events against a disposable MongoDB replica set.
3. Component tests: behavior, forms, async states, keyboard interaction, and automated accessibility.
4. E2E tests: learner, instructor, administrator, payment, and recovery journeys in production-like containers.
5. Non-functional suites: load, resilience, security, accessibility, browser compatibility, and backup restoration.

## Required coverage per change

- New domain branch: unit test.
- New endpoint: success, invalid input, unauthenticated, unauthorized/ownership, not found, conflict, and dependency-failure tests.
- New interactive component: keyboard and screen-reader name tests plus loading/empty/error behavior.
- Critical journey change: E2E happy path and most likely failure path.
- New query/index: representative-data performance evidence.
- Bug fix: regression test that fails before the fix.

The policy targets 90% coverage on changed domain/service code. Repository-wide percentage is reported but is not used to disguise untested critical paths with trivial tests.

## Current commands

```bash
pnpm test
pnpm --filter web test:coverage
pnpm --filter cognexa-server test
pnpm --filter web test:e2e
```

Current automated coverage includes API wiring/security/readiness/versioning/session failure behavior, atomic refresh-token rotation, request validation, frontend session restoration, safe AI response rendering, global route failure recovery, instructor workspace validation, publish readiness, Cloudinary signature determinism, nested ordering, autosave race handling, setup validation, and Playwright instructor authoring flows.

The 2026-07-27 release audit measured 10.8% statement coverage for `web` and 36.04% for `Server`. Assessment submission/grading, real MongoDB/Redis integration, catalog/enrollment component behavior, and end-to-end critical learner flows remain release blockers.

## Required production test environments

- Unit/component tests should run without shared external services.
- Integration tests must use ephemeral MongoDB replica-set and Redis containers; this harness is not yet implemented.
- Contract tests must cover email, media, and AI providers with deterministic failure modes; coverage is incomplete.
- E2E must seed users and courses through supported APIs; current browser coverage is limited to public/auth/instructor paths.
- Performance testing must use synthetic data; no production load result exists.

## Release suites

Smoke: health/readiness, public landing/catalog, registration/login/refresh/logout, enrollment, and instructor authoring. Learner completion/submission/grading joins this suite only when those capabilities ship.
Accessibility: keyboard-only critical flows, NVDA/JAWS or VoiceOver sample, zoom/reflow, captions, axe critical/serious zero.  
Security: dependency/secret/SAST scans, authorization matrix, rate-limit checks, malicious uploads, XSS/SSRF/injection payloads, session rotation/replay.  
Load: catalog reads, authentication/session rotation, course authoring autosave, and AI quota behavior.
Resilience: database primary change, provider timeout, queue backlog, cache loss, duplicate webhook, and rolling deployment.

## Test acceptance

Flaky tests are quarantined only with an owner and expiry. Production incidents add regression coverage. Test failures may not be bypassed for a release; an emergency deployment requires an incident commander, documented risk, a rollback plan, and immediate follow-up.

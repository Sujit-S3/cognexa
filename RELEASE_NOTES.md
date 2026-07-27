# Cognexa v1.0.0 Release Candidate

## Version summary

- Application version: `1.0.0`
- API contract: `/api/v1`, OpenAPI `1.0.0`
- Runtime images: `cognexa-server:1.0.0` and `cognexa-web:1.0.0` before digest pinning
- Release status: prepared, not tagged, not deployed
- Production decision: **No-Go** for public production

## Supported release surface

The release candidate supports identity/device sessions, public published-course discovery, enrollment, persisted instructor authoring and lifecycle controls, lecture comments, health/metrics/observability plumbing, and an authenticated AI gateway. See [the capability matrix](docs/CAPABILITIES.md) for exact boundaries.

## Important hardening

- Refresh tokens rotate atomically and replay loses the compare-and-swap race.
- Password reset/change revokes stale durable sessions.
- Supported course mutations use strict bounded request schemas.
- AI response text is escaped before supported Markdown is rendered.
- CI secret and container scans no longer rely on broad path or vulnerability suppressions.
- Production screens no longer invent courses, progress, grades, certificates, notifications, submissions, or administrative actions.

## Upgrade and deployment notes

Run additive migrations before rollout:

```bash
pnpm db:migrate:validate
pnpm db:migrate
```

Promote only immutable image digests. Staging and production require MongoDB, Redis, a metrics bearer token, secure cookies, immutable commit/version metadata, and a real authenticated AI gateway while `ai_tutor` is enabled.

## Release blockers

- Web/API coverage is 10.8%/36.04%; critical database-backed and learner-flow suites are incomplete.
- No verified cloud deployment, container build on this workstation, load/Lighthouse/accessibility/penetration result, or backup restore drill exists.
- Core learner playback/progress and assessment submission/grading are not implemented.
- Three moderate React Router advisories have no published compatible v6 patch; current SPA usage does not use the reported SSR/RSC or untrusted external-navigation paths, but the exception needs security-owner acceptance.
- The transitive Windows Sharp binary declares `Apache-2.0 AND LGPL-3.0-or-later`; distribution/license obligations need legal review even though Sharp is development-only and absent from runtime images.

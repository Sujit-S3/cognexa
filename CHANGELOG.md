# Changelog

All notable changes to Cognexa are documented here. Versions follow Semantic Versioning.

## [1.0.0] - Unreleased

### Added

- Release-aligned application, image, Kubernetes, and OpenAPI version metadata.
- Atomic refresh-token rotation regression coverage.
- Strict course, enrollment, module, module-item, profile, phone, and lecture-comment validation.
- Safe AI response Markdown rendering with XSS regression coverage.
- Additive indexes for recovery, deadlines, instructor activity, grades, comments, and achievements.
- Release capability matrix and final production-readiness audit.

### Changed

- Public catalog, course detail, and learner dashboard now show only API-backed data.
- Deployed `ai_tutor` environments require a real authenticated AI gateway.
- CI container scans fail on every critical finding without ignore files or unfixed-vulnerability bypasses.
- Secret scanning permits one exact shared test value and excludes no paths or commits.
- Release/deploy metadata and repository links identify Cognexa v1.0.0 consistently.
- Safe patch updates were applied to release tooling and frontend dependencies.

### Fixed

- Frozen pnpm workspace installs in container build contexts.
- Kustomize namespace/patch matching and structural manifest validation.
- Container runtime vulnerabilities caused by bundled npm and stale Alpine packages.
- Concurrent refresh-token replay, stale sessions after password changes/resets, and permissive profile/phone validation.
- Self-enrollment access to unpublished courses.
- Broken password-recovery email routing, unsafe email-name HTML, and course-comment moderation based on a global role instead of course privilege.
- CI cold-start test cleanup and timeout flakiness.
- Unsafe AI provider HTML rendering.

### Removed

- Broad Gitleaks allowlists and Trivy suppression.
- Demo-only learner playback, quiz, assignment, certificate, notification, and admin implementations.
- Disconnected social/notification/grading source files and their unused runtime dependencies.

### Security

- Dependency audit reports zero high or critical advisories. Three moderate React Router advisories remain documented because no patched compatible v6 release is published and the affected SSR/RSC/external-navigation paths are outside the Cognexa SPA usage.

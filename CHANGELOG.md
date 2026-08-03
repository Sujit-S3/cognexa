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
- Learner course playback for every lesson type (video, PDF, markdown, rich text, external URL, YouTube, live-session placeholder, file), with server-computed progress and a resume action.
- Learner quiz delivery: question-pool sampling, question/answer randomization, a per-attempt time limit, and synchronous auto-grading with per-question pass/fail feedback.
- Learner assignment submission with file attachments, drafts, and an instructor rubric-based grading queue.
- Automatic, idempotent certificate issuance on course completion, with on-demand PDF download and public verification by code.
- In-app notification center (quiz graded, assignment graded, certificate issued) with unread count and mark-read.
- Memory-server-backed integration test harness shared across new authenticated, DB-backed controller tests.
- Correct-answer/explanation reveal on a graded quiz submission, once the attempt is over.
- Administration console: a global-admin-only user directory (search, activate/deactivate, role change with self-lockout guards) and a platform audit log, backed by a shared insert-only `AuditLog` model.
- Organization tenancy: organizations with owner/admin/member roles, email invitations (hashed, time-limited, expired-at-read-time rather than TTL-deleted), assign-learning onto existing published courses, per-member progress reporting, and an organization-scoped audit log.

### Changed

- Public catalog, course detail, and learner dashboard now show only API-backed data.
- Deployed `ai_tutor` environments require a real authenticated AI gateway.
- CI container scans fail on every critical finding without ignore files or unfixed-vulnerability bypasses.
- Secret scanning permits one exact shared test value and excludes no paths or commits.
- Release/deploy metadata and repository links identify Cognexa v1.0.0 consistently.
- Safe patch updates were applied to release tooling and frontend dependencies.
- Course deadlines and the instructor dashboard now read live `Course.assessments[]` and submission data instead of the disconnected legacy assessment chain.
- The instructor course-media upload signature endpoint now authorizes per upload purpose (course ownership for authoring assets, enrollment for a learner's own assignment submission) instead of a single global instructor-only gate.
- `InstructorWorkspacePage`'s curriculum/assessment/setup/preview tabs are now lazy-loaded per tab instead of bundled eagerly, keeping the rich-text editor dependency out of the initial workspace chunk (491 KB → 8 KB initial load).

### Fixed

- Frozen pnpm workspace installs in container build contexts.
- Kustomize namespace/patch matching and structural manifest validation.
- Container runtime vulnerabilities caused by bundled npm and stale Alpine packages.
- Concurrent refresh-token replay, stale sessions after password changes/resets, and permissive profile/phone validation.
- Self-enrollment access to unpublished courses.
- Broken password-recovery email routing, unsafe email-name HTML, and course-comment moderation based on a global role instead of course privilege.
- CI cold-start test cleanup and timeout flakiness.
- Unsafe AI provider HTML rendering.
- Course and catalog responses either exposed the full quiz question bank (including answer keys) or hid assessments entirely; learner-facing reads now always strip `correctAnswers`/`explanation` and full question content, and draft (unpublished) assessments no longer leak to non-managing viewers.
- Instructor-authored rich-text lesson content and lesson/assignment URLs are sanitized and scheme-validated before learner-facing rendering, closing a stored-XSS and `javascript:`-URL vector in the first real learner content-rendering surface.
- `GET /courses/:courseId/enrollments` and the course-enrollment-role update endpoint populated the enrollment roster before checking the caller's course role, which broke the role check for any non-admin instructor/manager viewing or editing their own course's roster; the role check now runs before the populate.

### Removed

- Broad Gitleaks allowlists and Trivy suppression.
- Demo-only learner playback, quiz, assignment, certificate, notification, and admin implementations.
- Disconnected social/notification/grading source files and their unused runtime dependencies.
- Remaining live call sites of the dormant `Assessment`/`Submission`/`GradesSummary` model chain (the model files themselves are retained, unmodified, only because a shipped checksummed migration still references them).

### Security

- Dependency audit reports zero high or critical advisories. Three moderate React Router advisories remain documented because no patched compatible v6 release is published and the affected SSR/RSC/external-navigation paths are outside the Cognexa SPA usage.

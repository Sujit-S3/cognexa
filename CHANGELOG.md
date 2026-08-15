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
- Admin self-lockout guards (`POST /admin/users/:id/status`/`role`) compared route-param and canonical user ids as raw strings, so an admin could bypass their own deactivate/de-role guard by sending their id in a different letter case; the comparison is now id-equality, not string-equality.
- `GET /courses` returned every published course's full lesson content (video/PDF URLs, rich-text bodies, uploaded assets) to any authenticated user regardless of enrollment, bypassing the paywall the single-course endpoint already enforced; the authenticated list endpoint now strips lesson content the same way for anyone who isn't enrolled or the course owner.
- An organization member with the `admin` role could grant themselves (or anyone) `owner`, remove the actual owner, or invite a new member directly as `owner`; role changes, member removal, and invitations are now rank-checked so an actor can never grant or touch a role above their own.
- `Course.enroll()` used a read-then-write pattern with no database-level guard, so two concurrent enroll requests for the same learner (e.g. a double-clicked button) could both succeed and create duplicate enrollment records; enrollment (and organization assign-learning) now uses a single atomic conditional update.
- Certificate verification/download, the instructor dashboard, and both audit-log endpoints dereferenced populated `user`/`course`/`actor` references without checking for `null`, crashing with a generic 500 once the referenced account was deleted; all four now degrade to a fallback label instead of a 500, and account deletion now also pulls the deleted user out of any course's live enrollment roster (audit/achievement records are deliberately left intact as historical data).
- A certificate's score/grade was averaged across every graded attempt on a retryable assessment, including earlier failed attempts, understating the certificate relative to the learner's actual (passing) result; it's now computed from each assessment's best graded attempt.
- Manual assignment grading accepted a score or rubric total above the assessment's own maximum, producing certificates with a nonsensical percentage; grading now rejects an over-maximum score.
- Two learners posting the first comment on the same lesson at nearly the same time could create two separate comment threads, silently hiding whichever comment landed on the thread that didn't win; comment-thread creation is now an atomic upsert backed by a unique index.
- New-user registration always redirected to the student dashboard regardless of the role just selected, and login never honored the "return to where you were" redirect state set up by protected-route guards; both now route correctly.
- The instructor course editor's autosave and publish/status-change actions never invalidated the course-editor query cache (only the dashboard's), and a status-change click could race a pending autosave into a spurious "updated in another session" conflict; both now share one save path and keep the editor cache in sync.
- Several mutation flows (assignment-attempt start, admin user actions, organization member/invitation actions) had no error UI, so a failed request looked identical to a successful one; and course enrollment/un-enrollment didn't invalidate the learner's deadlines list or a previously-viewed course-detail page.
- Learner- and instructor-uploaded attachment links were rendered as raw hrefs with no URL-scheme check, allowing a `javascript:`/`data:` URL to execute in the viewer's session if clicked; attachment links now go through the same scheme guard already used for lesson content.
- The release workflow applied the new Kubernetes deployment (starting the rolling update) before running database migrations, and the server pod had no `preStop` delay, both of which could let new pods serve traffic before a concurrently-running migration finished or before Service endpoint removal had propagated; migrations now run first, and a 5-second `preStop` hook was added.

### Removed

- Broad Gitleaks allowlists and Trivy suppression.
- Demo-only learner playback, quiz, assignment, certificate, notification, and admin implementations.
- Disconnected social/notification/grading source files and their unused runtime dependencies.
- Remaining live call sites of the dormant `Assessment`/`Submission`/`GradesSummary` model chain (the model files themselves are retained, unmodified, only because a shipped checksummed migration still references them).

### Security

- Dependency audit reports zero high or critical advisories. Three moderate React Router advisories remain documented because no patched compatible v6 release is published and the affected SSR/RSC/external-navigation paths are outside the Cognexa SPA usage.

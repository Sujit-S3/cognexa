# Cognexa Engineering Specification

Status: active execution baseline  
Product class: B2C/B2B2C AI-enhanced LMS, course marketplace, and instructor operations platform  
Scale target: tens of thousands of registered users; 2,000 concurrent learners at initial production scale

Brand promise: **Connecting Knowledge, Empowering Minds.** Cognexa is positioned as a premium, intelligent, minimal, and trustworthy learning platform. Product language and interface decisions follow the [brand guide](BRAND_GUIDE.md).

## 1. Product intent

Cognexa connects knowledge with the people who need it, combining structured curricula, assessments, progress feedback, collaboration, and a course-aware AI tutor. Instructors need authoring, grading, communication, and cohort analytics. Institutions and platform operators need governance, safety, auditability, and reliable economics.

Primary business outcomes:

1. Increase activation: a new learner enrolls and completes a first lesson in one session.
2. Increase course completion through clear progress, deadlines, practice, and tutoring.
3. Reduce instructor workload through reusable content, objective grading, and assisted feedback.
4. Create a credible subscription and organization product without weakening academic integrity.

## 2. Users and jobs

| Persona                | Core job                                                     | Critical outcome                              |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| Learner                | Find a course, learn, practise, submit work, and get help    | Demonstrable mastery and completion           |
| Instructor             | Publish a course, guide a cohort, assess work, and intervene | Better outcomes with less administration      |
| Organization manager   | Assign learning and monitor a team                           | Completion, compliance, and ROI visibility    |
| Platform administrator | Operate users, content, billing, moderation, and incidents   | Safe, reliable, auditable operations          |
| Support operator       | Resolve account and learning issues                          | Fast resolution without excessive data access |

## 3. Assumptions and decisions still required

The execution plan assumes:

- English-first launch, with localization-ready content and UI identifiers.
- Responsive web is the primary client; native mobile is not an MVP dependency.
- MongoDB remains the system of record during modernization.
- Course video is delivered by a managed video provider; the API stores playback metadata, not raw video bytes.
- Payments, organization tenancy, and proctoring are feature-flagged releases after the learning core is stable.
- Real AI inference is performed by a server-side gateway with usage limits and safety controls.

Product owners must resolve before paid launch:

- Geography, learner age floor, and whether minors can register.
- Legal basis and retention period for webcam/microphone proctoring data.
- Refund window, tax jurisdictions, instructor revenue share, and dispute ownership.
- Accessibility conformance audit vendor and supported browser matrix.
- Course moderation policy, AI disclosure policy, and academic appeal process.
- Recovery objectives (RPO/RTO) and the budget for multi-region failover.

These decisions materially affect compliance, data modeling, pricing, and operating cost; they must not be inferred in code.

## 4. Scope and priorities

### MVP release

- Registration, sign-in, email verification, password recovery, device sessions, and RBAC.
- Public course catalog and detail pages.
- Enrollment, curriculum navigation, playback resume, and completion progress.
- Objective quizzes, assignments, submissions, instructor grading, and learner feedback.
- Student and instructor dashboards with real data.
- Course-aware AI tutor through the server gateway, with quotas and safety events.
- Notifications, announcements, calendar deadlines, certificates, and basic administration.
- Production CI, container images, backups, monitoring, incident runbook, and audit logging.

### Production expansion

- Course authoring wizard, drag-and-drop curriculum, drafts, scheduling, cloning, and versions.
- HLS video, transcripts, subtitles, chapters, notes, and playback analytics.
- Question pools, randomization, matching, ordering, code execution sandbox, and rubric grading.
- Search, community, moderation, grade book, cohort analytics, feature flags, and analytics events.
- Stripe billing, coupons, invoices, refunds, tax integration, and entitlement webhooks.
- Organization tenancy, invitations, team roles, SSO-ready identity boundaries, and tenant audit logs.
- PWA installation and deliberately scoped offline lesson access.

### Enterprise roadmap

- SAML/OIDC SSO, SCIM, custom roles, delegated administration, and data residency controls.
- LTI 1.3, xAPI/Caliper exports, public API keys, signed webhooks, and customer-managed integrations.
- Advanced retention policies, legal holds, security event export, and organization-specific encryption keys.
- Multi-region read scaling and tested disaster recovery.
- White-label domains, custom certificates, catalog controls, and contract SLAs.

Explicit non-goals for the first release: custom live-stream infrastructure, self-hosted global video transcoding, Kubernetes, microservices, and a native mobile application. Each adds operational load before product-market evidence justifies it.

## 5. Representative user stories and acceptance criteria

### Learner authentication

As a learner, I can remain signed in without exposing a long-lived credential to JavaScript.

- A successful login creates a server-side device session and a rotating `HttpOnly` refresh cookie.
- Access tokens expire in 15 minutes by default and are held only in memory.
- Refresh replay, expired sessions, inactive users, and password changes produce 401 responses.
- The learner can inspect and revoke device sessions and sign out all devices.
- Authentication endpoints are rate-limited and never reveal whether a recovery email exists.

### Course completion

As a learner, I can resume where I stopped and understand what remains.

- Enrollment authorization is verified by the API on every protected course request.
- Completion writes are idempotent and unique per learner/module item.
- Progress is derived from published required items, never trusted from the client.
- Concurrent updates cannot reduce completed progress.
- Empty, loading, offline, access-denied, and archived-course states are defined.

### Instructor publishing

As an instructor, I can safely publish a course without exposing unfinished material.

- Only course owners and authorized collaborators can edit.
- Draft and published versions are distinct; publishing is an audited action.
- A validation report blocks missing titles, inaccessible media, invalid assessment totals, or broken prerequisites.
- Existing enrolled learners see a deterministic version policy.
- Scheduled publication uses UTC internally and shows the instructor's time zone.

Current implementation: instructors can create a persisted draft, complete setup and SEO metadata, upload course media, order modules and lessons, configure lesson content, build quizzes and rubric-based assignments, preview the learner-facing structure, submit for review, publish, unpublish, archive, and restore without direct database access. Autosave uses optimistic `draftVersion` conflict detection, and publication is blocked until required course, media, curriculum, SEO, and assessment fields are complete.

The workspace supports video, PDF, Markdown, rich text, external URL, YouTube, and live-session placeholder lessons. Quizzes support single choice, multiple select, true/false, fill-in-the-blank, named question pools, question/answer randomization, passing score, and time limit. Assignments support a rich-text brief, due date, attachments, rubric criteria, and submission limits.

### AI tutor

As a learner, I can ask for help without leaking platform credentials or another learner's data.

- The browser never receives an AI provider key.
- Requests require enrollment-aware server authorization, quotas, and bounded input/output sizes.
- Course context is retrieved only from content the learner may access.
- Responses disclose that they are AI-generated and provide a feedback/report mechanism.
- Prompt, response, latency, token usage, model, safety outcome, and cost are traceable with privacy-aware retention.

### Assessment submission

As a learner, I can submit exactly once before a deadline and obtain a durable receipt.

- The API owns deadline and attempt checks; the client clock is advisory only.
- Idempotency keys prevent duplicate submissions during retries.
- File uploads are scanned, type/size constrained, and stored outside MongoDB.
- Objective grading is deterministic; AI-assisted grading remains reviewable and appealable.
- A submission receipt records server time, attempt, version, and content hash.

## 6. Engineering requirements

### Architecture

- A pnpm/Turborepo workspace coordinates the supported web and API packages.
- The API is a modular monolith with route/controller/service/repository boundaries. Domain events isolate notifications, analytics, search indexing, and AI jobs.
- MongoDB transactions are used for multi-document invariants and require a replica set in production.
- Redis is introduced when horizontally scaled rate limits, queues, locks, and ephemeral presence are needed; it is not the source of truth.
- Files use private object storage with signed URLs, malware scanning, lifecycle policies, and metadata in MongoDB.
- All new external contracts are versioned under `/api/v1` and described by OpenAPI.

### Frontend state

- TanStack Query owns server state, caching, invalidation, retries, and optimistic mutations.
- Zustand owns small cross-route client state such as the in-memory auth session and AI conversation draft.
- Component state owns transient interaction state.
- URL search parameters own shareable filters, pagination, and tabs.
- Browser storage is limited to non-sensitive device preferences such as theme and dismissed education.
- Instructor drafts use TanStack Query for fetch/invalidation and a non-persisted Zustand editing buffer for immediate updates. A 900 ms debounce saves to the API; retry, dirty, saving, saved, and conflict states remain visible.

### Security

- Deny-by-default authorization, explicit ownership checks, Zod validation, output shaping, and least-privilege service credentials.
- Short access tokens plus rotating server-side refresh sessions; secure cookie domain is limited to the application site.
- Strict CORS allowlist, CSP at the web edge, Helmet on API responses, abuse limits, secret scanning, dependency review, and protected branches.
- Uploaded content is never served from the API origin and is scanned before availability.
- AI prompts are treated as untrusted input; tools have explicit allowlists and server-side authorization.

### Accessibility and UX

- WCAG 2.2 AA target, semantic landmarks, keyboard completion, visible focus, form errors tied to fields, captions/transcripts, 200% zoom support, and reduced motion.
- Every data surface defines loading, skeleton, empty, partial-error, offline, forbidden, and retry states.
- Touch targets are at least 44 by 44 CSS pixels for primary mobile controls.
- Automated axe checks gate critical flows; a manual screen-reader and keyboard audit gates releases.

### SEO and acquisition

- Public marketing, catalog, course, instructor, and article pages require server rendering or prerendering before SEO is a growth channel.
- Canonical URLs, route-specific titles/descriptions, structured data, XML sitemaps, social cards, robots policy, and redirect management are release requirements.
- Authenticated application routes are `noindex` and excluded from sitemaps.

### Analytics

- Events use a versioned schema and include anonymous session, authenticated user (pseudonymous where possible), tenant, route, experiment, and request correlation identifiers.
- Required funnel: landing viewed → catalog searched → course viewed → registration → enrollment → first lesson → first assessment → course completion → paid conversion.
- Consent and regional controls load non-essential analytics only after permission.
- Product analytics must never receive passwords, access tokens, assessment answers, private messages, or raw AI prompts by default.

## 7. Quality and performance budgets

| Metric                    | Release budget                                 | Enforcement                        |
| ------------------------- | ---------------------------------------------- | ---------------------------------- |
| Lighthouse performance    | 95+ on representative mobile hardware          | CI smoke plus pre-release lab run  |
| Accessibility             | WCAG 2.2 AA; critical automated violations = 0 | Component/E2E axe and manual audit |
| Initial app JavaScript    | <250 KB gzipped                                | Build artifact check               |
| LCP                       | <2.5 s at p75                                  | RUM alert                          |
| INP                       | <200 ms at p75                                 | RUM alert                          |
| CLS                       | <0.1 at p75                                    | RUM alert                          |
| API read latency          | <200 ms p95 excluding external AI/video        | APM SLO                            |
| API write latency         | <350 ms p95 excluding uploads/jobs             | APM SLO                            |
| Availability              | 99.9% monthly for learning core                | Synthetic and server SLI           |
| Error rate                | <0.5% 5xx over 15 minutes                      | Pager alert                        |
| New/changed code coverage | >=90% for domain services                      | CI diff coverage                   |

The current route split produces a 155 KB gzipped main bundle. The optional 3D orb is an idle-loaded 237 KB chunk and is skipped for reduced-motion or data-saving users. Course imagery was reduced from roughly 1.9 MB to 229 KB total WebP output.

## 8. Delivery milestones and exit gates

| Milestone      | Scope                                                        | Exit gate                                        | Complexity |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------ | ---------- |
| M0 Baseline    | Supported path, workspace, CI, docs, security fixes          | Green quality pipeline; threat review complete   | Medium     |
| M1 Identity    | Verification, session UI, RBAC/ownership tests, audit events | Auth E2E and abuse tests pass                    | High       |
| M2 Course core | Authoring, versions, publish workflow, enrollment/progress   | Instructor-to-learner journey passes             | High       |
| M3 Assessments | Question engine, submissions, grading, receipts              | Deadline/idempotency/load tests pass             | High       |
| M4 Media       | Object storage, HLS provider, resume, transcript, notes      | Playback across support matrix                   | High       |
| M5 AI          | RAG context, quotas, safety, evaluation, cost controls       | Quality/safety evaluation thresholds pass        | High       |
| M6 Operations  | Notifications, search, analytics, admin, audit               | Operator runbooks and dashboards complete        | High       |
| M7 Commerce    | Plans, entitlements, webhooks, refunds, taxes                | Reconciliation and failure drills pass           | High       |
| M8 GA          | Accessibility, performance, DR, penetration testing          | Go-live checklist signed by product/security/ops | High       |

Two-week iterations are appropriate, but milestone dates depend on team size, content/video vendor selection, and unresolved compliance decisions. A credible GA for a small experienced team is measured in months, not a single sprint.

## 9. Test strategy and release acceptance

Every feature PR includes unit tests for domain logic, API integration tests for authorization/validation/invariants, component tests for behavior and accessibility, and an E2E happy path plus one failure path for critical journeys. Performance-sensitive queries include explain-plan evidence and representative data volume.

A release is accepted only when:

- CI lint, typecheck, tests, production builds, container builds, dependency scan, and secret scan pass.
- Database migrations/index changes have forward and rollback procedures.
- Feature flags default safely and have an owner/removal date.
- Dashboards and alerts exist before traffic is enabled.
- Runbooks cover rollback, provider outage, queue backlog, database saturation, and credential rotation.
- Accessibility, privacy, security, and product acceptance owners approve the release.

## 10. Major risks and recommended choices

| Risk                                    | Recommendation                                                                          | Trade-off / alternative                                                           |
| --------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Dual legacy and modern paths diverge    | Freeze legacy and migrate by domain behind versioned contracts                          | Big-bang rewrite is cleaner on paper but much riskier                             |
| Mongo relationships become inconsistent | Use explicit references, unique compound indexes, transactions, and repair jobs         | PostgreSQL would strengthen relational invariants but requires a costly migration |
| AI cost/quality volatility              | Server gateway, model routing, quotas, caching, evaluation set, kill switch             | Direct browser calls are simpler but expose credentials and remove governance     |
| Video cost and reliability              | Buy managed encoding/delivery first                                                     | Self-hosting offers control but creates a specialized operations burden           |
| Premature microservices                 | Keep a modular monolith and extract only independently scaling, failure-prone workloads | Microservices add deployment and data consistency overhead                        |
| Proctoring privacy exposure             | Make it optional, consented, minimal-retention, and legally reviewed                    | Avoid proctoring entirely where business requirements allow                       |

## 11. Success metrics

- Activation: 60% of verified new learners enroll; 45% complete a first lesson within 24 hours.
- Learning: 35% weekly active learners; 25% course completion for multi-week courses; measurable pre/post assessment improvement.
- Instructor: median first-course publish time under 90 minutes; grading time reduced by 30% without appeal-rate increase.
- Reliability: 99.9% learning-core availability; <0.5% API 5xx; no unresolved severity-1 security findings.
- Business: trial-to-paid conversion, monthly retention, organization activation, gross margin after AI/video costs, and support tickets per 1,000 active users.

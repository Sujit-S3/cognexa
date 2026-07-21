# Cognexa

**Connecting Knowledge, Empowering Minds.**

Cognexa is a premium AI-powered learning management system for modern educational institutions, instructors, enterprises, and learners. It unifies intelligent learning, course delivery, assessment, analytics, and collaboration in one trustworthy platform.

Our mission is to make high-quality knowledge easier to teach, discover, and master. Our vision is a world where every mind can reach the right knowledge at the right moment.

This repository is in an incremental modernization: `web/` and `Server/src/` are the supported production path; `Client/` and the JavaScript files outside `Server/src/` are retained only as migration references and must not receive new features.

## Product surfaces

| Surface       | Purpose                                        | Stack                                                             |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `web/`        | Public site and authenticated application      | React 19, TypeScript, Vite, React Router, TanStack Query, Zustand |
| `Server/src/` | Versioned API and background integrations      | Express, TypeScript, MongoDB/Mongoose, Zod, Pino                  |
| `Client/`     | Frozen legacy client                           | React/Redux/Ant Design                                            |
| `docs/`       | Engineering specification and operating guides | Markdown, OpenAPI, ADRs                                           |

## Local development

Prerequisites: Node.js 22+, Corepack, and MongoDB 7+ (or Docker).

```bash
corepack enable
pnpm install
copy Server\.env.example Server\.env
copy web\.env.example web\.env
pnpm dev
```

The web app runs on `http://localhost:5173`; the API runs on `http://localhost:4000`, with canonical endpoints under `/api/v1`.

Generate a real development secret before starting the API. Never commit `.env` files or use a `VITE_` variable for an AI, database, email, or signing credential.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter web test:e2e
```

`pnpm quality` runs the complete gate through Turborepo. The frontend is route-split; the main bundle budget is 250 KB gzipped. The cinematic 3D hero is intentionally isolated in an idle-loaded optional chunk and is skipped for reduced-motion or data-saving users.

## Containers

```bash
$env:SECRET_KEY = "replace-with-a-random-secret-at-least-32-characters"
docker compose up --build
```

This starts MongoDB, the API on port 4000, and the web application on port 8080. Production deployments should use a managed MongoDB replica set, managed object storage, a CDN/WAF, and a secret manager rather than Compose.

## Documentation

- [Engineering specification](docs/ENGINEERING_SPECIFICATION.md)
- [Brand guide](docs/BRAND_GUIDE.md)
- [Rebrand verification report](docs/REBRAND_REPORT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API contract](docs/openapi.yaml)
- [Testing strategy](docs/TESTING.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Environment setup](docs/ENVIRONMENTS.md)
- [Infrastructure guide](docs/INFRASTRUCTURE.md)
- [Operations manual](docs/OPERATIONS.md)
- [Backup and recovery](docs/RECOVERY.md)
- [Monitoring and alerting](docs/MONITORING.md)
- [Release guide](docs/RELEASES.md)
- [Production readiness](docs/PRODUCTION_READINESS.md)
- [Security policy](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)
- [Architecture decisions](docs/adr/0001-modular-monolith-and-incremental-migration.md)

## Current production boundaries

- Access tokens are short-lived and memory-only. Durable sessions use rotating opaque refresh tokens in `HttpOnly`, `SameSite=Lax`, production-secure cookies.
- AI provider credentials remain on the server. The browser calls the authenticated `/api/v1/ai/complete` gateway.
- API responses include `x-request-id`; structured logs redact authorization, cookie, and set-cookie values.
- `/health/live` reports process health and `/health/ready` reports required MongoDB/Redis readiness.
- `/health/dependencies` reports provider-neutral dependency state; `/metrics` is bearer-protected in deployed environments.
- Root API routes are compatibility aliases and carry deprecation/sunset headers. New integrations must use `/api/v1`.

The delivery backlog and release gates are intentionally explicit in the engineering specification; unimplemented roadmap items are not represented as shipped features.

## Instructor workspace

Instructors and administrators can open `/instructor` to create a MongoDB-backed draft and complete the entire authoring workflow in the application. The workspace includes a validated setup wizard, 900 ms debounced autosave with optimistic concurrency, direct signed Cloudinary uploads, nested drag-and-drop curriculum ordering, seven lesson types, quizzes, assignments with rubrics, learner/course analytics, preview, and the `draft → review → published → archived` lifecycle.

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `Server/.env` to enable course media. Provider secrets remain server-side; the browser receives only a short-lived, course-scoped upload signature after ownership authorization. Revenue remains visibly marked as unavailable until the commerce domain is implemented.

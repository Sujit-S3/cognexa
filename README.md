# Cognexa

AI-assisted learning platform for educational institutions and enterprises.

## Overview

Cognexa is a next-generation Learning Management System (LMS) designed for modern educational institutions, instructors, and learners. It combines an intelligent AI gateway with an intuitive instructor workspace, supporting comprehensive course authoring, enrollments, assessments, and analytics in a scalable, decoupled architecture.

## Key Features

- **AI-Assisted Learning:** Authenticated AI gateway for intelligent tutoring without exposing provider credentials to the client.
- **Instructor Workspace:** Complete authoring workflow with debounced autosave, optimistic concurrency, and direct Cloudinary uploads.
- **Advanced Curriculum Builder:** Nested drag-and-drop ordering, seven lesson types, quizzes, and assignment rubrics.
- **Durable Sessions:** Rotating opaque refresh tokens with robust device session management.
- **Enterprise Capabilities:** Global admin console, organization tenancy, role management, and audit logging.
- **Performance Optimized:** Route-split frontend with a strict bundle budget and isolated cinematic 3D assets.

## Architecture

Cognexa uses a modular monolith backend and an incremental migration architecture. The `web/` and `Server/src/` directories represent the modern, supported production path, communicating via a versioned REST API.

```mermaid
graph TD
    Client[Client Browser (Vite/React)] -->|REST| API[Node.js / Express API]
    API --> DB[(MongoDB Replica Set)]
    API --> Cache[(Redis)]
    API --> AIProvider[AI Model Provider]
    API --> CDN[Cloudinary CDN]
```

## Tech Stack

### Frontend (`web/`)
- **Framework:** React 19 + Vite + TypeScript
- **Routing & Data:** React Router, TanStack Query
- **State Management:** Zustand
- **Styling:** Tailwind CSS

### Backend (`Server/src/`)
- **Server:** Node.js, Express, TypeScript
- **Database:** MongoDB, Mongoose
- **Validation:** Zod
- **Logging:** Pino
- **Tooling:** Turborepo, pnpm

## Project Structure

```
cognexa/
├── web/             # Modern React 19 / Vite Frontend
├── Server/          # Node/Express Backend API
├── Client/          # Frozen legacy client (migration reference)
├── docs/            # Engineering specs and ADRs
└── config/          # Environment configuration examples
```

## Screenshots / Demo

*Demo environments are documented internally per deployment.*

## Installation

### Prerequisites
- Node.js (v22+)
- Corepack enabled (`corepack enable`)
- MongoDB (v7+) or Docker

### Clone the Repository
```bash
git clone https://github.com/Sujit-S3/cognexa.git
cd cognexa
pnpm install
```

## Environment Variables

Copy the example environment files and configure them:

```bash
copy Server\.env.example Server\.env
copy web\.env.example web\.env
```

Ensure `SECRET_KEY` in `Server/.env` is a random string of at least 32 characters. Do not use placeholder values in production.

## Running Locally

You can run the entire Turborepo stack simultaneously:

```bash
pnpm dev
```

Alternatively, use Docker Compose:
```bash
$env:SECRET_KEY="your-32-character-secret"
docker compose up --build
```
The web app runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

## API / Backend

The backend exposes a versioned REST API under `/api/v1`. 
- `/api/v1/ai/complete` - Authenticated AI gateway
- `/health/live` - Process health
- `/health/ready` - MongoDB/Redis readiness

## Testing

Quality gates are managed via Turborepo:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter web test:e2e
```
Or run the complete quality gate:
```bash
pnpm quality
```

## Deployment

Production deployments require:
- A managed MongoDB replica set.
- Managed object storage / CDN (e.g. Cloudinary).
- A secret manager for environment variables.
- Execution via `node dist/server.js` (not Docker Compose).

## Security

- Access tokens are memory-only.
- Refresh tokens are stored in `HttpOnly`, `SameSite=Lax` secure cookies.
- AI credentials remain server-side.
- Structured logs automatically redact authorization and cookie values.
- Dependency auditing is built into the CI pipeline.

## Future Improvements

- E-Commerce domain implementation for paid enrollments.
- Additional assessment integrations and automated grading pipelines.

## License

This project is licensed under the MIT License (or as specified in the repository root).

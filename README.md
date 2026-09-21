# Cognexa

**Computer Science & Systems Engineering Student | Full-Stack & AI Developer**

## 1. What the project is
Cognexa is a modern, scalable Learning Management System (LMS) designed for educational institutions, instructors, and learners. It features an AI-assisted learning gateway and an intuitive workspace that supports comprehensive course authoring, enrollments, and interactive assessments.

## 2. What problem it solves
Legacy LMS platforms often suffer from clunky course-building experiences and lack integrated AI capabilities for students. Cognexa solves this by providing a highly interactive, drag-and-drop curriculum builder with optimistic concurrency and debounced autosaves. It also safely integrates an AI tutor that assists learners in real-time, keeping API credentials secure on the backend.

## 3. What I personally built
I engineered the entire platform using a modern Turborepo stack, including:
- A responsive React 19 frontend utilizing TanStack Query for state management and caching.
- An advanced curriculum builder with drag-and-drop lesson reordering, supporting seven different lesson types and dynamic quiz rubrics.
- A secure Node.js/Express backend that proxies AI requests and manages user state through a robust MongoDB schema.
- An authentication system utilizing rotating, opaque refresh tokens stored in secure `HttpOnly` cookies.

## 4. Main features
- **Instructor Workspace:** Complete authoring workflow with debounced autosave, optimistic concurrency, and direct Cloudinary media uploads.
- **Advanced Curriculum Builder:** Nested drag-and-drop ordering, rich-text lesson types, quizzes, and assignment rubrics.
- **AI-Assisted Learning:** Authenticated AI gateway for intelligent tutoring without exposing provider credentials to the client browser.
- **Durable Sessions:** Rotating opaque refresh tokens with robust device session management.
- **Role-Based Access Control:** Differentiated capabilities for Admins, Instructors, and Students.
- **Performance Optimized:** Route-split frontend designed with a strict bundle budget.

## 5. Architecture
Cognexa uses a modular monolith backend and a modern React frontend, communicating via a versioned REST API. The codebase is managed within a Turborepo monorepo.
```mermaid
graph TD
    Client[Client Browser (Vite/React)] -->|REST| API[Node.js / Express API]
    API --> DB[(MongoDB Replica Set)]
    API --> AIProvider[AI Model Provider]
    API --> CDN[Cloudinary CDN]
```

## 6. Technology stack
- **Frontend (`web/`):** React 19, Vite, TypeScript, React Router, TanStack Query, Zustand, Tailwind CSS
- **Backend (`Server/src/`):** Node.js, Express, TypeScript, Zod, Pino
- **Database:** MongoDB (Mongoose)
- **Tooling:** Turborepo, pnpm
- **Security:** Helmet, `HttpOnly` cookies, bcrypt

## 7. Demo
*(Add Live Demo link here if available)*

## 8. Screenshots
*(Add screenshots of the Instructor Workspace, Curriculum Builder, and Course Player here)*

## 9. Installation
```bash
git clone https://github.com/Sujit-S3/cognexa.git
cd cognexa

# Enable corepack and install dependencies
corepack enable
pnpm install
```

## 10. Environment variables
Copy the example environment files and configure them:
```bash
copy Server\.env.example Server\.env
copy web\.env.example web\.env
```
Ensure `SECRET_KEY` in `Server/.env` is a random string of at least 32 characters. Do not use placeholder values in production.

## 11. Testing
Quality gates and tests are managed via Turborepo:
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter web test:e2e

# Run the complete CI quality gate locally
pnpm quality
```

## 12. Deployment
You can run the entire Turborepo stack simultaneously for local development:
```bash
pnpm dev
```
Alternatively, use Docker Compose:
```bash
$env:SECRET_KEY="your-32-character-secret"
docker compose up --build
```
The web app runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

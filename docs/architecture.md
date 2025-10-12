# Task Manager Application — Architecture Overview

## High-Level Goals
- Rebuild the AppSheet Task Manager as a responsive web app with a fast “Open Tasks” workflow.
- Maintain the original behaviors (date-grouped sidebar, inline actions, rollover bot) while providing a modern developer-friendly stack.
- Support multi-user editing with realtime UI updates and optimistic interactions.

## Technology Stack
- **Frontend:** Vite + React + TypeScript. React Query handles data fetching and optimistic updates. Styling uses Tailwind CSS for fast iteration plus a small set of custom utility classes.
- **Backend:** Node.js + Express + TypeScript. RESTful routes expose CRUD and “inline action” operations. Zod validates payloads before touching the database.
- **Database:** SQLite via Prisma ORM. Provides strong schema guarantees while staying lightweight for local development; can be swapped for Postgres/MySQL later without rewriting code.
- **Realtime:** Socket.IO bridges the backend and all connected clients, broadcasting task changes so the UI always reflects the latest state.
- **Scheduling:** `node-cron` (or native `setInterval` with health checks) triggers the daily rollover automation at 02:00 server time.
- **Testing:** Vitest (frontend) and Jest (backend) cover critical domain logic (priority transitions, rollover rules, API contracts).

## Key Modules
- `server/src/index.ts` — Express bootstrap, Socket.IO server, cron scheduler.
- `server/src/routes/tasks.ts` — CRUD endpoints and specialized task actions (`/move-next-day`, `/move-priority`, etc.).
- `server/src/services/taskService.ts` — Core business logic for priority changes, due-date shifts, completion handling, rollover.
- `server/src/jobs/rollover.ts` — Daily job ensuring overdue open tasks roll to today.
- `web/src/App.tsx` — Application shell with sidebar + main content layout.
- `web/src/features/taskList` — Data fetching hooks, components for grouped list, action buttons, detail drawer.
- `web/src/features/taskForm` — Dialog/drawer for create & edit flows with schema-driven validation.

## Data Model Notes
- `Task` model mirrors the specification (status, urgency, follow-up flag, project reference, URLs). Prisma relations link tasks to optional projects.
- Default values (`status: "Open"`, `dueDate: today`, etc.) are enforced at both database and API layers.
- Inline action visibility is determined by derived state in the frontend but backed by guard clauses in the service layer to enforce business rules.

## API Overview (Draft)
- `GET /tasks?status=Open&from=<date>&to=<date>` — Fetch tasks, grouped by due date client-side.
- `POST /tasks` — Create task with validation and sensible defaults.
- `PATCH /tasks/:id` — General updates (title, description, project, URLs).
- `POST /tasks/:id/actions/move-priority` — Body includes `{ direction: "up" | "down" }`.
- `POST /tasks/:id/actions/move-date` — Body accepts `{ type: "nextDay" | "plusTwo" | "nextMonday" }`.
- `POST /tasks/:id/actions/complete` — Marks complete, stamps `completedDate`.
- `GET /projects` & `POST /projects` — Lightweight project management endpoints.

## Realtime + Optimistic Workflow
1. User clicks an action button (e.g., “Move to next day”).
2. React Query immediately updates the cached task list (optimistic state).
3. Request hits Express; `taskService` persists the change and emits a Socket.IO event.
4. All clients receive the event and update their local caches, ensuring consistency.

## Deployment & Environment
- Local development uses two processes (`npm run dev` in both `server` and `web`).
- Shared `.env` file provides database path and cron schedule. Prisma migrations live in `server/prisma`.
- The app is deployable on a single Node process (e.g., Render, Railway) with a persistent SQLite or managed Postgres database.

## Next Steps
1. Scaffold backend (`server/`), initialize Prisma schema, and wire Express routes.
2. Scaffold frontend (`web/`), establish layout and shared UI primitives.
3. Implement task actions end-to-end, then the daily rollover job.
4. Add integration tests for critical flows and document run/deploy steps.

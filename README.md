# Task Manager Application

Rebuild of the AppSheet-based Task Manager as a full-stack application with a modern React frontend and an Express/Prisma backend. The app focuses on the “Open Tasks” workflow with date-grouped navigation, inline actions, and automatic rollover of unfinished work.

## Tech Stack
- **Frontend:** Vite + React + TypeScript, Tailwind CSS, React Query, Socket.IO client.
- **Backend:** Express + TypeScript, Prisma ORM (SQLite by default), Zod validation, Socket.IO server, node-cron for scheduled rollover.
- **Tooling:** Workspace-managed npm packages, ESLint, Vitest/Jest (scaffolding in place for future tests).

## Getting Started
1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   ```
   Adjust values as needed (`DATABASE_URL`, `PORT`, `ROLL_OVER_CRON`).

3. **Generate Prisma client & apply migrations**
   ```bash
   cd server
   npx prisma migrate dev --name init
   ```

4. **Start development servers**
   ```bash
   # in separate terminals or using the root script
   npm run dev --workspace server
   npm run dev --workspace web
   # or
   npm run dev
   ```
   - API available at `http://localhost:4000`
   - Web app available at `http://localhost:5173`

## Core Functionality
- **Open Tasks View**  
  Left sidebar groups tasks by due date (with today highlighted). Main pane lists tasks with priority badges, inline action buttons, due date, and project. Detail drawer reveals full task metadata, links, and an entry point for editing.

- **Inline Task Actions**  
  Buttons trigger priority adjustments, due-date shifts (tomorrow, +2 days, next Monday), and completion. Optimistic updates give instant feedback while syncing with the backend.

- **Task Editing & Creation**  
  Slide-in form drawer supports creating new tasks or editing existing ones (title, description, due date, urgency, follow-up flag, project, and reference links). Projects can be created on the fly while linking a task.

- **Search & Filters**  
  Inline search plus a project dropdown help you focus on the most relevant open tasks.

- **Realtime Updates**  
  Socket.IO keeps connected clients in sync—changes from one user broadcast globally.

- **Daily Rollover Automation**  
  A cron job (default 02:00 server time) bumps overdue open tasks to “today,” preventing items from slipping through the cracks.

## API Outline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/tasks` | List tasks (filters: status, search, projectId, from/to) |
| GET    | `/tasks/:id` | Fetch a single task |
| POST   | `/tasks` | Create a task |
| PATCH  | `/tasks/:id` | Update task fields/status |
| DELETE | `/tasks/:id` | Delete a task |
| POST   | `/tasks/:id/actions/move-priority` | Move priority up/down |
| POST   | `/tasks/:id/actions/move-date` | Shift due date by preset offsets |
| POST   | `/tasks/:id/actions/complete` | Mark complete & timestamp |
| GET    | `/projects` | List projects with task counts |
| POST   | `/projects` | Create a new project |

All write operations validate payloads with Zod and enforce business rules (e.g., P1 cannot increase further).

## Project Structure
```
task_management_1110/
├── docs/
│   └── architecture.md
├── server/
│   ├── src/
│   │   ├── jobs/rollover.ts
│   │   ├── lib/prisma.ts
│   │   ├── middleware/errorHandler.ts
│   │   ├── realtime/events.ts
│   │   ├── routes/{projects,tasks}.ts
│   │   ├── services/{projectService,taskService}.ts
│   │   ├── utils/{asyncHandler,date,errors}.ts
│   │   └── index.ts
│   └── prisma/schema.prisma
├── web/
│   ├── src/
│   │   ├── api/
│   │   ├── features/tasks/components/
│   │   ├── hooks/
│   │   ├── realtime/
│   │   ├── types/
│   │   └── utils/
│   └── index.html, vite config, Tailwind config, etc.
└── README.md
```

## Testing
- Unit/integration test scaffolding (Jest for backend, Vitest for frontend) is included in package manifests. Implement targeted tests for:
  - `taskService` priority/due-date transitions.
  - Rollover job behavior.
  - React components (e.g., task table interactions).

## Future Enhancements
1. **Virtualized Task List** – Introduce `react-window` or similar to handle extremely large task volumes smoothly.
2. **Completed Tasks View** – Add dedicated archive views with filtering and restore options.
3. **Authentication & Roles** – Secure endpoints and tailor UI based on user permissions.
4. **Bulk Operations & Advanced Filters** – Allow multi-select, project-based filters, and follow-up-only views.
5. **Notifications & Reminders** – Email/chat integrations for due soon/overdue tasks.
6. **Project Management** – Expand project metadata (owners, color tags) and integrate deeper cross-filtering.

## Notes
- The project currently assumes a local SQLite database (`file:./dev.db`). Swap to Postgres/MySQL by updating the Prisma datasource and rerunning migrations.
- When running in production, configure CORS origins, secure cron scheduling, and Socket.IO transports accordingly.

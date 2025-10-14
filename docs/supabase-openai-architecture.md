# Supabase + OpenAI Architecture

## Overview

This document outlines the redesigned architecture using Supabase as the backend and OpenAI Vector Store for AI-powered task querying via ChatGPT.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Task Board   │  │ Auth UI      │  │ Mobile Views │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           ↓ ↑
                    Supabase Client JS
                           ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Platform                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Postgres DB  │  │ Auth         │  │ Real-time    │      │
│  │ - Tasks      │  │ - Email/OAuth│  │ Subscriptions│      │
│  │ - Projects   │  │ - RLS        │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌─────────────────────────────────────────────────┐       │
│  │         Edge Functions (Deno)                    │       │
│  │  - Daily Rollover (cron)                         │       │
│  │  - Vector Store Sync (cron + on-change)          │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           ↓
                  Sync Service (Edge Function)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  OpenAI Vector Store                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Task Embeddings (indexed by user_id)             │       │
│  │ - Task metadata (title, description, priority)   │       │
│  │ - Due dates, project associations                │       │
│  │ - Updated daily or on-change                     │       │
│  └─────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────┐       │
│  │ OpenAI Assistant (with function calling)         │       │
│  │ - Query: "List my tasks today"                   │       │
│  │ - Query: "Show all P1 tasks"                     │       │
│  │ - Query: "What's due next Monday?"               │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           ↑
                       ChatGPT
```

## Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Data Fetching:** Supabase Client (@supabase/supabase-js)
- **State Management:** React Query (for caching) + Supabase real-time

### Backend
- **Platform:** Supabase
- **Database:** PostgreSQL (managed by Supabase)
- **Authentication:** Supabase Auth (email/password, OAuth providers)
- **Real-time:** Supabase Real-time (Postgres CDC)
- **Edge Functions:** Supabase Edge Functions (Deno runtime)

### AI Layer
- **Vector Store:** OpenAI Vector Store (for embeddings)
- **Assistant:** OpenAI Assistants API
- **Embeddings Model:** text-embedding-3-small or text-embedding-3-large
- **LLM:** GPT-4 or GPT-4 Turbo

## Database Schema (Supabase)

### Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Completed')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  urgency TEXT NOT NULL DEFAULT 'P3' CHECK (urgency IN ('P1', 'P2', 'P3', 'P4')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_date TIMESTAMP WITH TIME ZONE,
  follow_up_item BOOLEAN NOT NULL DEFAULT FALSE,
  url1 TEXT,
  url2 TEXT,
  url3 TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

-- Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);
```

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Completed', 'Archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id);
```

## Authentication Flow

1. **User Sign Up/Sign In:**
   - Email/Password via Supabase Auth
   - OR OAuth (Google, GitHub, etc.)

2. **Session Management:**
   - Supabase handles JWT tokens automatically
   - Frontend: `supabase.auth.getSession()`
   - Protected routes: Check `auth.user` state

3. **Row Level Security:**
   - All queries automatically filtered by `user_id`
   - No user can see another user's tasks/projects

## OpenAI Vector Store Integration

### Data Format for Embeddings

Each task is synced as a document with metadata:

```json
{
  "id": "uuid",
  "content": "Title: Finish proposal\nDescription: Complete Q4 proposal for client XYZ\nPriority: P1\nDue: 2025-10-15\nProject: Client Work",
  "metadata": {
    "user_id": "uuid",
    "task_id": "uuid",
    "title": "Finish proposal",
    "description": "Complete Q4 proposal for client XYZ",
    "status": "Open",
    "urgency": "P1",
    "due_date": "2025-10-15T00:00:00Z",
    "project_name": "Client Work",
    "follow_up_item": false
  }
}
```

### Sync Strategy

**Option 1: Daily Sync (Simple)**
- Edge Function runs daily (e.g., 3 AM)
- Fetches all user tasks
- Updates vector store with full dataset
- Pros: Simple, reliable
- Cons: Slightly stale data

**Option 2: Real-time Sync (Advanced)**
- Supabase Database Webhook triggers Edge Function on INSERT/UPDATE/DELETE
- Incremental updates to vector store
- Pros: Always up-to-date
- Cons: More complex, higher API usage

**Recommended: Hybrid Approach**
- Daily full sync as backup
- Webhook-triggered incremental updates for changes
- Best of both worlds

### Edge Function: Vector Store Sync

```typescript
// supabase/functions/sync-vector-store/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY")!,
  });

  // Fetch all open tasks (or filter by updated_at for incremental sync)
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*, project:projects(name)")
    .eq("status", "Open");

  if (error) throw error;

  // Convert tasks to embedding documents
  const documents = tasks.map((task) => ({
    id: task.id,
    content: `Title: ${task.title}\nDescription: ${task.description || "N/A"}\nPriority: ${task.urgency}\nDue: ${task.due_date}\nProject: ${task.project?.name || "None"}`,
    metadata: {
      user_id: task.user_id,
      task_id: task.id,
      title: task.title,
      status: task.status,
      urgency: task.urgency,
      due_date: task.due_date,
      project_name: task.project?.name,
    },
  }));

  // Upload to OpenAI Vector Store
  // (Batch upload implementation here)

  return new Response(
    JSON.stringify({ synced: documents.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

## ChatGPT Integration

### OpenAI Assistant Configuration

```typescript
const assistant = await openai.beta.assistants.create({
  name: "Task Manager Assistant",
  instructions: `You are a personal task management assistant.
  You help users query their tasks using natural language.
  Always filter results by the user_id in metadata.
  Format responses in a clean, organized way.`,
  model: "gpt-4-turbo",
  tools: [
    { type: "retrieval" }, // Vector store search
    {
      type: "function",
      function: {
        name: "list_tasks",
        description: "List user's tasks with filters",
        parameters: {
          type: "object",
          properties: {
            date_filter: {
              type: "string",
              enum: ["today", "tomorrow", "this_week", "overdue", "all"],
            },
            priority_filter: {
              type: "string",
              enum: ["P1", "P2", "P3", "P4", "all"],
            },
            project_name: { type: "string" },
          },
        },
      },
    },
  ],
});
```

### Example ChatGPT Queries

**User:** "List my tasks for today"
→ Assistant queries vector store with `due_date = today` filter
→ Returns formatted list

**User:** "Show all P1 tasks"
→ Assistant queries with `urgency = P1` filter
→ Returns high-priority items

**User:** "What's overdue?"
→ Assistant queries with `due_date < today AND status = Open`
→ Returns overdue tasks

**User:** "What am I working on for the Client Project?"
→ Assistant queries with `project_name LIKE '%Client%'`
→ Returns project-specific tasks

## Rollover Automation

### Edge Function: Daily Rollover

```typescript
// supabase/functions/daily-rollover/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().split("T")[0];

  // Update overdue tasks to today
  const { data, error } = await supabase
    .from("tasks")
    .update({ due_date: today })
    .eq("status", "Open")
    .lt("due_date", today);

  if (error) throw error;

  return new Response(
    JSON.stringify({ updated: data?.length || 0 }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

**Schedule:** Run daily at 2 AM via Supabase Cron

## Frontend Changes

### Before (Express API):
```typescript
const response = await fetch('http://localhost:4000/tasks');
const tasks = await response.json();
```

### After (Supabase Client):
```typescript
const { data: tasks, error } = await supabase
  .from('tasks')
  .select('*, project:projects(name)')
  .eq('status', 'Open')
  .order('due_date', { ascending: true });
```

### Real-time Subscriptions:
```typescript
const channel = supabase
  .channel('tasks-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Update React state
      queryClient.invalidateQueries(['tasks']);
    }
  )
  .subscribe();
```

## Deployment

### Frontend
- **Platform:** Vercel or Netlify
- **Environment Variables:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Backend
- **Platform:** Supabase (fully managed)
- **Edge Functions:** Deploy via Supabase CLI
- **Cron Jobs:** Configure in Supabase dashboard

### OpenAI
- **API Key:** Stored in Supabase secrets
- **Vector Store:** Created via OpenAI dashboard
- **Assistant:** Configured via OpenAI API

## Migration Plan

1. ✅ Create Supabase project
2. ✅ Set up database tables and RLS
3. ✅ Configure authentication
4. ✅ Update frontend to use Supabase client
5. ✅ Remove Express server
6. ✅ Deploy Edge Functions (rollover + vector sync)
7. ✅ Set up OpenAI vector store
8. ✅ Configure ChatGPT assistant
9. ✅ Test end-to-end flow
10. ✅ Deploy to production

## Benefits

✅ **No backend server to manage** - Supabase handles everything
✅ **Real-time updates** - Better than Socket.IO
✅ **Scalable** - Postgres handles millions of records
✅ **Secure** - Row Level Security built-in
✅ **AI-powered** - Natural language task queries
✅ **Modern stack** - Industry standard tools
✅ **Cost-effective** - Supabase free tier is generous

## Estimated Costs

- **Supabase:** Free tier (up to 500MB database, 2GB storage)
- **OpenAI:**
  - Vector store: $0.10 per GB/month
  - Embeddings: ~$0.02 per 1000 tasks
  - ChatGPT API: ~$0.01 per query
- **Vercel/Netlify:** Free tier

**Total:** ~$5-10/month for moderate usage

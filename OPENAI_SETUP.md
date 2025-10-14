# OpenAI Vector Store & ChatGPT Setup Guide

This guide walks you through setting up the OpenAI integration for natural language task queries via ChatGPT.

## Prerequisites

- OpenAI API account (sign up at https://platform.openai.com)
- Supabase project already set up
- OpenAI API key with access to Assistants API

## Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it (e.g., "Task Manager - Vector Store")
4. Copy the key (starts with `sk-...`)
5. **Save it securely** - you won't see it again!

## Step 2: Create Vector Store

You can create a vector store via API or the OpenAI dashboard.

### Option A: Via OpenAI Dashboard (Recommended)

1. Go to https://platform.openai.com/storage
2. Click "Create vector store"
3. Name it: `task-manager-vectors`
4. Copy the Vector Store ID (starts with `vs_...`)

### Option B: Via API

```bash
curl https://api.openai.com/v1/vector_stores \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{
    "name": "task-manager-vectors"
  }'
```

Save the returned `id` field.

## Step 3: Create OpenAI Assistant

### Via API

```bash
curl https://api.openai.com/v1/assistants \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{
    "name": "Task Manager Assistant",
    "instructions": "You are a personal task management assistant. You help users query their tasks using natural language. Always filter results by the user_id in metadata. Format responses in a clean, organized way. When showing tasks, include: priority (P1/P2/P3/P4), title, due date, and project name if available. Group tasks logically (by date or priority) when appropriate.",
    "model": "gpt-4-turbo-preview",
    "tools": [
      {
        "type": "file_search"
      }
    ],
    "tool_resources": {
      "file_search": {
        "vector_store_ids": ["vs_YOUR_VECTOR_STORE_ID"]
      }
    }
  }'
```

Save the returned `id` field (starts with `asst_...`).

### Via OpenAI Dashboard

1. Go to https://platform.openai.com/assistants
2. Click "Create assistant"
3. Fill in:
   - **Name:** Task Manager Assistant
   - **Model:** gpt-4-turbo-preview (or gpt-4)
   - **Instructions:** (paste the instructions from above)
   - **Tools:** Enable "File search"
   - **Vector Stores:** Select the vector store you created
4. Click "Create"
5. Copy the Assistant ID

## Step 4: Configure Environment Variables

Add these to your Supabase Edge Functions environment:

```bash
cd /Users/macbook/Documents/Projects/task_management_1110

# Set secrets for Edge Functions
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here
supabase secrets set OPENAI_VECTOR_STORE_ID=vs_your-vector-store-id-here
supabase secrets set OPENAI_ASSISTANT_ID=asst_your-assistant-id-here
```

Or update your `supabase/.env` file:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_VECTOR_STORE_ID=vs_your-vector-store-id-here
OPENAI_ASSISTANT_ID=asst_your-assistant-id-here
```

## Step 5: Deploy Sync Function

```bash
cd /Users/macbook/Documents/Projects/task_management_1110

# Deploy the sync-vector-store function
supabase functions deploy sync-vector-store
```

## Step 6: Initial Sync

Trigger the initial sync to populate the vector store:

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/sync-vector-store' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Check the logs:

```bash
supabase functions logs sync-vector-store --tail
```

## Step 7: Set Up Automatic Sync

### Option A: Daily Cron (Recommended for Most)

Set up a cron job to sync daily at 3 AM:

```sql
-- In Supabase SQL Editor
SELECT cron.schedule(
  'daily-vector-sync',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/sync-vector-store',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    )
  );
  $$
);
```

### Option B: Real-time Sync via Webhooks (Advanced)

For real-time updates, set up database webhooks:

1. Go to Supabase Dashboard → Database → Webhooks
2. Create webhook:
   - **Name:** Task Update Sync
   - **Table:** tasks
   - **Events:** INSERT, UPDATE, DELETE
   - **Webhook URL:** `https://your-project-ref.supabase.co/functions/v1/sync-vector-store`
   - **HTTP Headers:** Add `Authorization: Bearer YOUR_ANON_KEY`

## Step 8: Configure ChatGPT Custom GPT (Optional)

To use your assistant in ChatGPT interface:

1. Go to https://chat.openai.com/gpts/editor
2. Click "Create a GPT"
3. Configure:
   - **Name:** My Task Manager
   - **Description:** Personal task management assistant
   - **Instructions:** Link to your assistant
   - **Actions:** Add API actions to query tasks

Or simply use the Assistants API directly in your app.

## Step 9: Test the Integration

### Test via API

```bash
curl https://api.openai.com/v1/threads \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{}'
```

Save the thread `id`, then send a message:

```bash
curl https://api.openai.com/v1/threads/thread_YOUR_THREAD_ID/messages \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{
    "role": "user",
    "content": "List my tasks for today"
  }'
```

Run the assistant:

```bash
curl https://api.openai.com/v1/threads/thread_YOUR_THREAD_ID/runs \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{
    "assistant_id": "asst_YOUR_ASSISTANT_ID"
  }'
```

### Test via ChatGPT (if using Custom GPT)

Simply ask:
- "List my tasks for today"
- "What's due next week?"
- "Show me all P1 tasks"
- "What am I working on for the Client Project?"

## Example Queries You Can Ask

Once set up, you can ask ChatGPT:

### By Date
- "What tasks do I have today?"
- "Show me tomorrow's tasks"
- "What's due this week?"
- "What's overdue?"

### By Priority
- "Show me all P1 tasks"
- "What are my high priority items?"
- "List tasks by priority"

### By Project
- "What tasks are in the Client Project?"
- "Show me all project-related work"
- "What's unassigned?"

### By Status
- "What follow-up items do I have?"
- "Show me completed tasks from yesterday"

### Complex Queries
- "What P1 tasks are due before Friday?"
- "Show me overdue follow-up items"
- "What tasks without a project are due soon?"

## Sync Frequency Recommendations

- **Light usage** (< 100 tasks): Daily sync at 3 AM
- **Moderate usage** (100-1000 tasks): Twice daily (3 AM and 3 PM)
- **Heavy usage** (> 1000 tasks): Incremental webhook-based sync
- **Real-time needs**: Webhook on every task change

## Cost Estimates

### OpenAI Costs

- **Embedding (text-embedding-3-small):**
  - ~$0.02 per 1000 tasks
  - Example: 500 tasks synced daily = ~$0.30/month

- **Vector Store Storage:**
  - $0.10 per GB/month
  - Example: 1000 tasks ≈ 1-2 MB = ~$0.01/month

- **ChatGPT API Queries (GPT-4 Turbo):**
  - $0.01 per 1k input tokens
  - $0.03 per 1k output tokens
  - Example: 100 queries/day ≈ $5-10/month

**Total estimate:** $5-15/month for moderate usage

## Troubleshooting

### Vector store is empty
- Check sync function logs: `supabase functions logs sync-vector-store`
- Manually trigger sync: `curl -X POST https://...`
- Verify OPENAI_API_KEY and OPENAI_VECTOR_STORE_ID are set

### ChatGPT can't find my tasks
- Ensure vector store is linked to assistant
- Check that files were uploaded to the vector store
- Verify user_id in metadata matches your queries

### Sync failing
- Check OpenAI API key is valid
- Ensure vector store ID is correct
- Check Supabase function logs for errors
- Verify tasks exist in database

### Outdated results
- Check when last sync ran
- Trigger manual sync
- Consider more frequent cron schedule

## Advanced: Function Calling

For more control, you can add custom functions to the assistant:

```json
{
  "type": "function",
  "function": {
    "name": "query_tasks",
    "description": "Query user's tasks with filters",
    "parameters": {
      "type": "object",
      "properties": {
        "date_filter": {
          "type": "string",
          "enum": ["today", "tomorrow", "this_week", "overdue", "all"]
        },
        "priority": {
          "type": "string",
          "enum": ["P1", "P2", "P3", "P4"]
        },
        "project_name": {
          "type": "string"
        }
      }
    }
  }
}
```

This allows more precise filtering beyond vector search.

## Security Considerations

- ✅ **User Isolation:** Vector store metadata includes `user_id` to prevent cross-user data leakage
- ✅ **API Key Security:** Store OpenAI key in Supabase secrets, never in client code
- ✅ **Rate Limiting:** Implement rate limiting on sync function to prevent abuse
- ⚠️ **PII Handling:** Be cautious with sensitive task data in vector embeddings

## Resources

- [OpenAI Assistants API Docs](https://platform.openai.com/docs/assistants/overview)
- [Vector Stores Guide](https://platform.openai.com/docs/assistants/tools/file-search)
- [File Search Best Practices](https://platform.openai.com/docs/assistants/tools/file-search/best-practices)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)


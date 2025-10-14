# Quick Custom GPT Setup (Better Output!)

The vector store approach gives messy output. Here's how to create a Custom GPT that queries your database directly for clean, structured results.

## 🎯 Why This is Better

**Vector Store (Current):**
- ❌ Messy output like "Due Today: October 14, 2025 Priority P2 null..."
- ❌ Requires manual sync
- ❌ Text-based search only

**Custom GPT with Direct API:**
- ✅ Clean, formatted output
- ✅ Always up-to-date (no sync needed)
- ✅ Structured queries by date, priority, project
- ✅ Perfect formatting

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Custom GPT

1. Go to https://chatgpt.com/gpts/editor
2. Click **"Create a GPT"**

### Step 2: Configure Basic Info

**Name:** `My Task Manager`

**Description:**
```
Personal task management assistant that queries your Supabase database for tasks
```

**Instructions:**
```
You are a personal task management assistant that helps users query their tasks.

You have access to a Supabase database with tasks. When users ask about their tasks:

1. Query the tasks API to get current data
2. Format the response cleanly with:
   - Priority with emoji (P1: 🔴 Urgent, P2: 🟡 High, P3: 🔵 Medium, P4: ⚪ Low)
   - Due date in friendly format (Today, Tomorrow, Oct 14, etc.)
   - Project name or "No Project"
   - Clean, organized layout

3. Group tasks logically (by date, priority, or project)

Example queries to handle:
- "What tasks do I have today?" → Filter by due_date=today, status=Open
- "Show me P1 tasks" → Filter by urgency=P1, status=Open
- "List all my tasks" → Get all tasks with status=Open

Always use the API to get fresh data. Be concise and helpful.
```

**Conversation starters:**
```
What tasks do I have today?
Show me all P1 tasks
What's due this week?
List my overdue items
```

### Step 3: Add API Action

1. Scroll to **"Actions"**
2. Click **"Create new action"**
3. Paste this schema:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Task Manager API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://ihheipfihcgtzhujcmdn.supabase.co"
    }
  ],
  "paths": {
    "/rest/v1/tasks": {
      "get": {
        "summary": "Get user's tasks",
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "schema": {"type": "string", "enum": ["Open", "Completed"]}
          },
          {
            "name": "urgency",
            "in": "query",
            "schema": {"type": "string", "enum": ["P1", "P2", "P3", "P4"]}
          },
          {
            "name": "due_date",
            "in": "query",
            "schema": {"type": "string"}
          },
          {
            "name": "select",
            "in": "query",
            "schema": {"type": "string", "default": "*"}
          }
        ],
        "responses": {
          "200": {
            "description": "Tasks list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {"type": "string"},
                      "title": {"type": "string"},
                      "urgency": {"type": "string"},
                      "due_date": {"type": "string"},
                      "description": {"type": "string"},
                      "status": {"type": "string"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### Step 4: Set Authentication

**Authentication Type:** `API Key`

**API Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGVpcGZpaGNndHpodWpjbWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MzEsImV4cCI6MjA3NTM0MDQzMX0.wWNhyAYovdswvFlu1Qp8Gqp88YVnHKlY_5hwJzeV8TE
```

**Custom Header Name:** `apikey`

**Custom Header Value:** (same as API Key)

### Step 5: Save & Test

1. Click **"Save"** (top right)
2. Choose **"Only me"**
3. Click **"Confirm"**

Now test it! Ask: **"What tasks do I have?"**

---

## 🎯 Expected Clean Output

Instead of the messy vector store output, you'll get:

```
📋 Your Tasks for Today (October 14, 2025)

🟡 P2 - somethign more
   Due: Today | No Project

🔵 P3 - test1745
   Due: Today | No Project

🔵 P3 - something
   Due: Today | No Project

🔵 P3 - something else
   Due: Today | No Project

Total: 4 tasks
```

---

## 🔧 Troubleshooting

### "No tasks found"
- Make sure you're logged into the app at http://localhost:5174/
- The API needs your user session to see your tasks (RLS security)

### "Authentication error"
- Double-check the API key is correct
- Ensure both `apikey` header and Bearer token are set

### "Invalid schema"
- Make sure the JSON is valid (no trailing commas)
- Test the schema in the GPT editor

---

## 💡 Pro Tips

1. **Natural Language:** "What should I work on today?" works great
2. **Follow-up Questions:** "What about tomorrow?" after asking about today
3. **Priority Filtering:** "Show me urgent tasks" finds P1 items
4. **Date Queries:** "What's due this week?" filters by date range

---

## 🆚 Comparison

| Feature | Vector Store | Custom GPT |
|---------|-------------|------------|
| **Setup** | ✅ Already done | 5 min setup |
| **Output Quality** | ❌ Messy | ✅ Clean |
| **Data Freshness** | ❌ Requires sync | ✅ Always current |
| **Query Types** | ❌ Semantic only | ✅ Structured |
| **Formatting** | ❌ Raw text | ✅ Beautiful |

**Recommendation:** Use Custom GPT for daily task queries!

---

## 🎉 Result

Once set up, you'll get beautifully formatted task lists that are always up-to-date, with no manual syncing required!

Try asking:
- "What tasks do I have today?"
- "Show me all P1 tasks"
- "What should I work on?"
- "List tasks by priority"

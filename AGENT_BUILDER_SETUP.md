# OpenAI Agent Builder Setup

## Overview
We're implementing OpenAI's Agent Builder to replace the current unreliable AI chat implementation. Agent Builder provides:
- Better tool calling with built-in function calling
- More reliable conversation handling
- Professional-grade error handling
- Conversation memory across sessions

## Step 1: Create Agent Builder Project

### 1.1 Go to OpenAI Platform
1. Navigate to https://platform.openai.com/agents
2. Click "Create Agent"
3. Name your agent: "Task Manager Assistant"

### 1.2 Configure the Agent
- **Instructions**:
```
You are a helpful task management assistant. You help users manage their tasks by understanding their requests and taking appropriate actions.

Priority levels: P1 (highest/urgent), P2 (high), P3 (medium), P4 (low)

You can:
- View tasks and provide insights
- Create new tasks with appropriate priority and due dates
- Update task status (mark as completed, change priority)
- Delete tasks
- Manage projects

Always be helpful, intelligent, and provide insights about the user's tasks.
```

## Step 2: Create Tools

### 2.1 Tool: get_tasks
- **Name**: get_tasks
- **Description**: Get all tasks for the current user
- **Endpoint**: https://ihheipfihcgtzhujcmdn.supabase.co/rest/v1/tasks
- **Method**: GET
- **Headers**:
  - Authorization: Bearer {{SUPABASE_ANON_KEY}}
  - apikey: {{SUPABASE_ANON_KEY}}
- **Query Parameters**:
  - select: id,title,description,status,urgency,due_date,project_id,created_at
  - status: eq.Open
  - order: due_date.asc

### 2.2 Tool: create_task
- **Name**: create_task
- **Description**: Create a new task
- **Endpoint**: https://ihheipfihcgtzhujcmdn.supabase.co/rest/v1/tasks
- **Method**: POST
- **Headers**:
  - Authorization: Bearer {{SUPABASE_ANON_KEY}}
  - apikey: {{SUPABASE_ANON_KEY}}
  - Content-Type: application/json
- **Body Schema**:
```json
{
  "title": "string (required)",
  "description": "string (optional)",
  "urgency": "string (P1|P2|P3|P4, default: P3)",
  "due_date": "string (ISO date, default: today)",
  "status": "string (Open|Completed, default: Open)"
}
```

### 2.3 Tool: update_task
- **Name**: update_task
- **Description**: Update an existing task
- **Endpoint**: https://ihheipfihcgtzhujcmdn.supabase.co/rest/v1/tasks
- **Method**: PATCH
- **Headers**:
  - Authorization: Bearer {{SUPABASE_ANON_KEY}}
  - apikey: {{SUPABASE_ANON_KEY}}
  - Content-Type: application/json
- **URL Parameters**: id={{task_id}}
- **Body Schema**:
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "urgency": "string (P1|P2|P3|P4, optional)",
  "due_date": "string (ISO date, optional)",
  "status": "string (Open|Completed, optional)",
  "completed_date": "string (ISO date, set when status=Completed)"
}
```

### 2.4 Tool: delete_task
- **Name**: delete_task
- **Description**: Delete a task
- **Endpoint**: https://ihheipfihcgtzhujcmdn.supabase.co/rest/v1/tasks
- **Method**: DELETE
- **Headers**:
  - Authorization: Bearer {{SUPABASE_ANON_KEY}}
  - apikey: {{SUPABASE_ANON_KEY}}
- **URL Parameters**: id={{task_id}}

## Step 3: Environment Variables
You'll need these values from your Supabase project:
- `SUPABASE_URL`: https://ihheipfihcgtzhujcmdn.supabase.co
- `SUPABASE_ANON_KEY`: Your anon key from Supabase dashboard

## Step 4: Test the Agent
1. Save and deploy the agent
2. Test with these commands:
   - "Show me my tasks today"
   - "Create a task to call mom tomorrow"
   - "Mark all P3 tasks as completed"
   - "Delete the task called 'test task'"

## Step 5: Integrate with Web App
Once the agent is working, we'll create a clean chat interface that connects to your Agent Builder agent.

## Benefits of Agent Builder
- ✅ Reliable tool calling (no more JSON parsing issues)
- ✅ Better error handling
- ✅ Conversation memory
- ✅ Professional-grade implementation
- ✅ Easy to maintain and extend
- ✅ Built-in analytics and monitoring

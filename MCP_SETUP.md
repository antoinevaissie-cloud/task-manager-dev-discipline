# MCP (Model Context Protocol) Setup for Task Manager

This guide shows you how to set up MCP integration so ChatGPT can directly read and create tasks in your task manager.

## 🎯 **What is MCP?**

MCP allows ChatGPT to use **tools** (functions) to interact with your applications directly. Instead of using a Custom GPT with API calls, ChatGPT can call functions to:
- ✅ Read your tasks
- ✅ Create new tasks
- ✅ Update existing tasks
- ✅ Manage projects
- ✅ Filter by date, priority, status

## 📋 **Prerequisites**

- Node.js installed
- Your Supabase project running
- ChatGPT Plus or Enterprise (MCP requires paid plan)

## 🚀 **Setup Steps**

### **Step 1: Install Dependencies**

```bash
cd mcp-server
npm install
```

### **Step 2: Configure API Keys**

1. **Copy the config file:**
```bash
cp config.example.js config.js
```

2. **Get your Supabase keys:**
   - Go to: https://supabase.com/dashboard/project/ihheipfihcgtzhujcmdn/settings/api
   - Copy the **"service_role"** key (this gives full database access)

3. **Edit `config.js` and add your keys:**
```javascript
export const config = {
  supabase: {
    url: 'https://ihheipfihcgtzhujcmdn.supabase.co',
    anonKey: 'your_anon_key_here',
    serviceRoleKey: 'your_actual_service_role_key_here' // ← Use this one
  },
  server: {
    port: 3001
  }
};
```

### **Step 3: Test the MCP Server**

```bash
npm start
```

You should see: `Task Manager MCP server running on stdio`

### **Step 4: Configure ChatGPT to Use MCP**

1. **Open ChatGPT** (chatgpt.com)
2. **Go to Settings** → **Beta Features**
3. **Enable "Model Context Protocol"**
4. **Go to Settings** → **Connections**
5. **Click "Connect tool"**
6. **Select "Local server"**
7. **Configure the connection:**
   - **Name:** `Task Manager`
   - **Command:** `node`
   - **Arguments:** `/Users/macbook/Documents/Projects/task_management_1110/mcp-server/index.js`
   - **Working Directory:** `/Users/macbook/Documents/Projects/task_management_1110/mcp-server`

### **Step 5: Test the Integration**

Once connected, try these commands in ChatGPT:

```
"What tasks do I have today?"
"Create a new task called 'Buy groceries' with priority P2"
"Show me all P1 tasks"
"What projects do I have?"
"Create a project called 'Home Renovation'"
```

## 🛠 **Available Tools**

The MCP server provides these tools:

### **📖 Reading Tasks**
- `get_tasks` - Get tasks with filters (status, urgency, due_date, project_id)

### **✏️ Creating Tasks**
- `create_task` - Create new tasks with title, description, priority, due date

### **📝 Updating Tasks**
- `update_task` - Update existing tasks (title, status, priority, due date)

### **📁 Project Management**
- `get_projects` - List all projects
- `create_project` - Create new projects

## 💡 **Example Conversations**

### **"What tasks do I have today?"**
ChatGPT will call `get_tasks` with `due_date: "2025-10-14"` and show you a formatted list.

### **"Create a high priority task for tomorrow"**
ChatGPT will call `create_task` with:
- `title: "Your task name"`
- `urgency: "P1"`
- `due_date: "2025-10-15"`

### **"Mark my grocery shopping task as completed"**
ChatGPT will call `update_task` with:
- `task_id: "task-id"`
- `status: "Completed"`

## 🔧 **Troubleshooting**

### **MCP Server Won't Start**
- Check that Node.js is installed: `node --version`
- Verify config.js has correct Supabase keys
- Check console for error messages

### **ChatGPT Can't Connect**
- Ensure MCP server is running (`npm start`)
- Verify the file paths in ChatGPT connection settings
- Check that MCP is enabled in ChatGPT beta features

### **Database Errors**
- Verify Supabase service role key is correct
- Check that your Supabase project is active
- Ensure database tables exist (run migrations if needed)

## 🎉 **Benefits of MCP vs Custom GPT**

| Feature | MCP | Custom GPT |
|---------|-----|------------|
| **Real-time data** | ✅ Always current | ❌ Needs manual sync |
| **Create tasks** | ✅ Direct creation | ❌ Read-only |
| **Update tasks** | ✅ Full CRUD | ❌ Read-only |
| **Natural queries** | ✅ "Create task for tomorrow" | ❌ Limited to API calls |
| **Setup complexity** | 🟡 Medium | 🟢 Simple |
| **Maintenance** | ✅ Self-maintaining | ❌ Manual sync needed |

## 🚀 **Next Steps**

1. **Set up the MCP server** (follow steps above)
2. **Test with simple queries** ("show my tasks")
3. **Try creating tasks** ("create a task to call mom")
4. **Explore advanced queries** ("what P1 tasks are due this week?")

Once working, you'll have a powerful AI assistant that can manage your tasks naturally! 🎯


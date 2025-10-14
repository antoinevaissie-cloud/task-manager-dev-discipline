# Custom GPT Setup Guide

This guide shows you how to create a Custom GPT in ChatGPT that can query your tasks.

## 🎯 Two Options Available

### **Option 1: Use Assistant in Playground** (Quick & Easy)
- Best for: Testing, personal use
- Setup time: 0 minutes (already done!)
- Cost: Pay-per-use

### **Option 2: Create Custom GPT** (Better UX)
- Best for: Daily use in ChatGPT interface
- Setup time: 10 minutes
- Requires: ChatGPT Plus subscription

---

## 🚀 Option 1: Use Your Assistant (Already Done!)

### **Step 1: Create Some Tasks**

1. Open http://localhost:5174/
2. Sign up for an account
3. Create a few tasks with different:
   - Priorities (P1, P2, P3, P4)
   - Due dates (today, tomorrow, next week)
   - Projects (optional)

### **Step 2: Sync to OpenAI**

Run the sync script:

```bash
cd /Users/macbook/Documents/Projects/task_management_1110
./sync-to-openai.sh
```

### **Step 3: Query Your Tasks**

Go to: https://platform.openai.com/playground/assistants

1. Select **"Task Manager Assistant"** from dropdown
2. Ask questions like:
   - "List my tasks for today"
   - "Show me all P1 tasks"
   - "What's due this week?"
   - "What are my overdue items?"

**That's it! Your assistant will search the vector store and return your tasks.**

---

## 🤖 Option 2: Create Custom GPT (ChatGPT Plus Required)

This gives you a better experience directly in ChatGPT.

### **Step 1: Create the GPT**

1. Go to https://chatgpt.com/gpts/editor
2. Click **"Create a GPT"**

### **Step 2: Configure Basic Settings**

In the **Configure** tab:

**Name:**
```
My Task Manager
```

**Description:**
```
Personal task management assistant that queries your Supabase tasks database
```

**Instructions:**
```
You are a personal task management assistant. You help users:
- View their tasks for today, tomorrow, or any date range
- See tasks by priority (P1 = Urgent, P2 = High, P3 = Medium, P4 = Low)
- Filter tasks by project
- Check overdue items

Always format responses clearly with:
- Priority level with emoji (P1: 🔴 Urgent, P2: 🟡 High, P3: 🔵 Medium, P4: ⚪ Low)
- Due date in friendly format (e.g., "Today", "Tomorrow", "Oct 15")
- Project name if applicable

Group tasks logically by date or priority. Be concise and helpful.

When users ask about tasks:
1. First, query the tasks API with appropriate filters
2. Parse the results
3. Format them in a clean, organized way

Example queries you should handle:
- "What tasks do I have today?" → Filter by due_date=today, status=Open
- "Show me P1 tasks" → Filter by urgency=P1, status=Open
- "What's overdue?" → Filter by due_date<today, status=Open
- "List all my tasks" → Get all tasks with status=Open
```

**Conversation starters:**
```
What tasks do I have today?
Show me all P1 tasks
What's due this week?
List my overdue items
```

### **Step 3: Add Actions**

1. Scroll down to **"Actions"** section
2. Click **"Create new action"**
3. Copy the content from `custom-gpt-schema.json` and paste into the Schema field

OR manually set up:

**Authentication:**
- Type: **API Key**
- Auth Type: **Bearer**
- API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGVpcGZpaGNndHpodWpjbWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MzEsImV4cCI6MjA3NTM0MDQzMX0.wWNhyAYovdswvFlu1Qp8Gqp88YVnHKlY_5hwJzeV8TE`

**Additional Headers:**
- Header: `apikey`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGVpcGZpaGNndHpodWpjbWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MzEsImV4cCI6MjA3NTM0MDQzMX0.wWNhyAYovdswvFlu1Qp8Gqp88YVnHKlY_5hwJzeV8TE`

**Schema:**
Paste the entire content of `custom-gpt-schema.json`

### **Step 4: Test the Actions**

In the GPT editor, test the actions:

1. Click **"Test"** next to an action
2. It should connect to your Supabase database
3. You'll see your tasks in JSON format

### **Step 5: Save & Use**

1. Click **"Save"** (top right)
2. Choose **"Only me"** for privacy
3. Click **"Confirm"**

Now you can use your Custom GPT in ChatGPT!

---

## 📝 Example Queries

Once set up, you can ask:

### **By Date:**
- "What tasks do I have today?"
- "Show me tomorrow's tasks"
- "What's due this week?"
- "List everything due before Friday"

### **By Priority:**
- "Show me all P1 tasks"
- "What are my urgent items?"
- "List tasks by priority"

### **By Status:**
- "What's overdue?"
- "Show me completed tasks from last week"

### **By Project:**
- "What tasks are in the Client Project?"
- "Show me unassigned tasks"

### **Complex:**
- "What P1 tasks are due today?"
- "Show me overdue P2 and P1 items"
- "What tasks don't have a project assigned?"

---

## 🔄 Syncing Tasks

Your Custom GPT queries the **live database** via Supabase REST API, so:
- ✅ Always up-to-date (no sync needed!)
- ✅ Instant updates
- ✅ Works as soon as you create tasks

The vector store approach (Option 1) requires manual syncing:
- Run `./sync-to-openai.sh` after creating/updating tasks
- Or set up automatic daily sync (already configured to run at 3 AM)

---

## 🆚 Which Option Should I Use?

### **Use Option 1 (Assistant) if:**
- You want to test quickly
- You don't have ChatGPT Plus
- You're okay using the Playground

### **Use Option 2 (Custom GPT) if:**
- You have ChatGPT Plus
- You want to use it daily in ChatGPT
- You want the best UX
- You want always-up-to-date results (no manual sync)

**Best of both worlds:** Use both!
- Custom GPT for daily queries (always current)
- Assistant for advanced semantic search (once synced)

---

## 🐛 Troubleshooting

### **"No tasks found"**

**For Assistant (Option 1):**
- Make sure you've created tasks in the app
- Run `./sync-to-openai.sh` to sync
- Wait a few seconds for indexing

**For Custom GPT (Option 2):**
- Check that you're logged in to the app
- Verify the API key is correct
- Make sure you've created tasks

### **Authentication errors**

- Double-check the API key in Actions configuration
- Ensure both `apikey` header and Bearer token are set
- The key should match the one in your `.env` file

### **Custom GPT not working**

- Make sure you have ChatGPT Plus subscription
- Verify the Schema is valid JSON
- Test each action individually
- Check that the server URL is correct

---

## 💡 Pro Tips

1. **Use Natural Language:** The Custom GPT understands context better than the Assistant
2. **Be Specific:** "P1 tasks due today" is better than "urgent tasks"
3. **Follow Up:** You can have conversations: "What about tomorrow?" after asking about today
4. **Combine Filters:** "Show me P1 and P2 tasks due this week"

---

## 🎯 Next Steps

1. **Try Option 1 first** (already set up!)
2. Create some tasks at http://localhost:5174/
3. Run `./sync-to-openai.sh`
4. Query in Playground
5. **If you like it**, set up Custom GPT (Option 2)

---

## 📚 Resources

- **OpenAI Playground:** https://platform.openai.com/playground/assistants
- **Custom GPT Editor:** https://chatgpt.com/gpts/editor
- **Your Assistant:** https://platform.openai.com/assistants/asst_ZyrElaYRgYI7g5hInmbImQ2c
- **Your Vector Store:** https://platform.openai.com/storage/vector_stores/vs_68ee734152b08191aac4547e34f21750
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ihheipfihcgtzhujcmdn

Happy querying! 🚀


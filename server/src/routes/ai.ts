import express from 'express';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Initialize Supabase client for database operations
// Use service role key for server-side operations with explicit user context
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ihheipfihcgtzhujcmdn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '***REMOVED_SUPABASE_SERVICE_ROLE_KEY***'
);

// Initialize OpenAI with API key from environment (secure server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '***REMOVED_OPENAI_KEY***'
});

// Define tools for the AI agent
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Get all open tasks for the current user',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The task title'
          },
          description: {
            type: 'string',
            description: 'Optional task description'
          },
          urgency: {
            type: 'string',
            enum: ['P1', 'P2', 'P3', 'P4'],
            description: 'Task priority level (P1=highest, P4=lowest)',
            default: 'P3'
          },
          due_date: {
            type: 'string',
            description: 'Due date in YYYY-MM-DD format'
          }
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update an existing task',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'The ID of the task to update'
          },
          title: {
            type: 'string',
            description: 'New task title'
          },
          description: {
            type: 'string',
            description: 'New task description'
          },
          urgency: {
            type: 'string',
            enum: ['P1', 'P2', 'P3', 'P4'],
            description: 'New task priority level'
          },
          due_date: {
            type: 'string',
            description: 'New due date in YYYY-MM-DD format'
          },
          status: {
            type: 'string',
            enum: ['Open', 'Completed'],
            description: 'New task status'
          }
        },
        required: ['task_id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Delete a task',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'The ID of the task to delete'
          }
        },
        required: ['task_id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_multiple_tasks',
      description: 'Create multiple tasks at once',
      parameters: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of tasks to create'
          },
          base_title: {
            type: 'string',
            description: 'Base title for tasks (will be numbered)'
          },
          urgency: {
            type: 'string',
            enum: ['P1', 'P2', 'P3', 'P4'],
            description: 'Priority level for all tasks'
          },
          due_date: {
            type: 'string',
            description: 'Due date for all tasks (e.g., "today", "tomorrow", "next monday", or specific date)'
          }
        },
        required: ['count'],
        additionalProperties: false
      }
    }
  }
];

// Tool execution functions
const executeTool = async (toolName: string, args: any, userId: string, userToken: string) => {
  // Using service role client with explicit user_id filtering for RLS bypass

  switch (toolName) {
    case 'get_tasks':
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, description, status, urgency, due_date, project_id, created_at')
        .eq('status', 'Open')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (tasksError) {
        throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
      }

      // Return a summary instead of raw objects
      if (tasks.length === 0) {
        return "No open tasks found.";
      }

      return `Found ${tasks.length} open tasks. Tasks exist and are ready for operations.`;

    case 'create_task':
      // Parse the due_date properly
      let dueDate = new Date();
      if (args.due_date) {
        // Handle different date formats
        const parsedDate = new Date(args.due_date);
        if (isNaN(parsedDate.getTime())) {
          // If date is invalid, try to calculate "next monday" etc.
          const today = new Date();
          const lowerDate = args.due_date.toLowerCase();

          if (lowerDate.includes('monday')) {
            // Calculate next Monday
            const daysUntilMonday = (1 - today.getDay() + 7) % 7;
            dueDate = new Date(today.getTime() + (daysUntilMonday || 7) * 24 * 60 * 60 * 1000);
          } else if (lowerDate.includes('tomorrow')) {
            // Tomorrow - ensure we get the correct date
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1);
          } else {
            // Default to today if we can't parse
            dueDate = new Date();
          }
        } else {
          dueDate = parsedDate;
        }
      }

      const taskData = {
        title: args.title,
        description: args.description || null,
        urgency: args.urgency || 'P3',
        due_date: dueDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        status: 'Open',
        user_id: userId // Explicitly set user_id for RLS policy
      };

      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create task: ${createError.message}`);
      }

      return `Task created: "${newTask.title}" (${newTask.urgency}, due: ${newTask.due_date})`;

    case 'update_task':
      console.log('Update task args received:', args);
      const updateData: any = {};
      if (args.title) updateData.title = args.title;
      if (args.description) updateData.description = args.description;
      if (args.urgency) updateData.urgency = args.urgency;
      if (args.due_date) {
        console.log('Processing due_date:', args.due_date);
        const parsedDate = new Date(args.due_date);
        if (!isNaN(parsedDate.getTime())) {
          updateData.due_date = parsedDate.toISOString().split('T')[0];
          console.log('Parsed date:', updateData.due_date);
        } else {
          console.log('Invalid date, trying relative date calculation');
          // Handle relative dates like "next monday"
          const today = new Date();
          const lowerDate = args.due_date.toLowerCase();

          if (lowerDate.includes('monday')) {
            const daysUntilMonday = (1 - today.getDay() + 7) % 7;
            const nextMonday = new Date(today.getTime() + (daysUntilMonday || 7) * 24 * 60 * 60 * 1000);
            updateData.due_date = nextMonday.toISOString().split('T')[0];
            console.log('Calculated next Monday:', updateData.due_date);
          } else {
            console.log('Could not parse date:', args.due_date);
          }
        }
      }
      if (args.status) {
        updateData.status = args.status;
        if (args.status === 'Completed') {
          updateData.completed_date = new Date().toISOString();
        }
      }

      // Handle bulk updates (when no specific task_id is provided)
      if (!args.task_id) {
        console.log('Bulk update data:', updateData);

        // Update all tasks for the user
        const { data: updatedTasks, error: updateError } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('user_id', userId)
          .eq('status', 'Open') // Only update open tasks
          .select();

        if (updateError) {
          throw new Error(`Failed to update tasks: ${updateError.message}`);
        }

        console.log(`Bulk update result: ${updatedTasks.length} tasks updated`);
        return `Updated ${updatedTasks.length} tasks successfully`;
      }

      // Handle single task update
      const { data: updatedTask, error: updateError } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', args.task_id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update task: ${updateError.message}`);
      }

      return `Task updated: "${updatedTask.title}" is now ${updatedTask.status}`;

    case 'delete_task':
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', args.task_id)
        .eq('user_id', userId);

      if (deleteError) {
        throw new Error(`Failed to delete task: ${deleteError.message}`);
      }

      return `Task deleted successfully`;

    case 'create_multiple_tasks':
      const taskCount = args.count || 1;
      const baseTitle = args.base_title || 'Task';
      const taskUrgency = args.urgency || 'P3';
      const taskDueDate = args.due_date || 'today';

      // Parse the due_date properly
      let multipleTaskDueDate = new Date();
      if (taskDueDate) {
        const parsedDate = new Date(taskDueDate);
        if (isNaN(parsedDate.getTime())) {
          const today = new Date();
          const lowerDate = taskDueDate.toLowerCase();

          if (lowerDate.includes('monday')) {
            const daysUntilMonday = (1 - today.getDay() + 7) % 7;
            multipleTaskDueDate = new Date(today.getTime() + (daysUntilMonday || 7) * 24 * 60 * 60 * 1000);
          } else if (lowerDate.includes('tomorrow')) {
            multipleTaskDueDate = new Date();
            multipleTaskDueDate.setDate(multipleTaskDueDate.getDate() + 1);
          } else {
            multipleTaskDueDate = new Date();
          }
        } else {
          multipleTaskDueDate = parsedDate;
        }
      }

      const tasksToCreate = [];
      for (let i = 1; i <= taskCount; i++) {
        tasksToCreate.push({
          title: `${baseTitle} ${i}`,
          description: null,
          urgency: taskUrgency,
          due_date: multipleTaskDueDate.toISOString().split('T')[0],
          status: 'Open',
          user_id: userId
        });
      }

      const { data: createdTasks, error: multipleCreateError } = await supabase
        .from('tasks')
        .insert(tasksToCreate)
        .select();

      if (multipleCreateError) {
        throw new Error(`Failed to create tasks: ${multipleCreateError.message}`);
      }

      return `Created ${taskCount} tasks successfully: ${createdTasks.map(t => t.title).join(', ')}`;

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};

// AI Chat endpoint
router.post('/chat', authMiddleware, asyncHandler(async (req, res) => {
  const { message } = req.body;
  const userId = req.user?.id; // Assuming you have user authentication middleware
  const authHeader = req.headers.authorization;
  const userToken = authHeader?.split(' ')[1]; // Extract Bearer token

  if (!userId || !userToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  try {
    // Create the conversation with system prompt
    const messages = [
      {
        role: 'system',
        content: `You are a helpful task management assistant. You help users manage their tasks by understanding their requests and taking appropriate actions.

Priority levels: P1 (highest/urgent), P2 (high), P3 (medium), P4 (low)

IMPORTANT DATE HANDLING:
- When user says "tomorrow" → use "tomorrow" as the due_date (don't calculate actual dates)
- When user says "next monday" → use "next monday" as the due_date
- When user says "today" → use "today" as the due_date
- When user says "next week" → use "next week" as the due_date
- Only use specific dates (YYYY-MM-DD) when the user provides them explicitly

You can:
- View tasks and provide insights about priorities, due dates, and workload
- Create new tasks with appropriate priority and due dates
- Update task status (mark as completed, change priority, update due dates)
- Delete tasks when requested

Always be helpful, intelligent, and provide insights about the user's tasks. When creating tasks, use sensible defaults (P3 priority, today's date) unless specified otherwise.

IMPORTANT: Be efficient and avoid unnecessary operations. When you successfully complete a task (like creating multiple tasks), don't perform additional operations unless specifically requested.

CRITICAL: When a user requests a bulk operation, you must complete the FULL workflow. Don't stop after checking if tasks exist - proceed to perform the actual update operation.

For bulk operations like "change all tasks" or "update all tasks":
1. Directly call update_task with the requested changes (no task_id needed)
2. The update_task function will handle finding and updating all matching tasks
3. Don't call get_tasks first - just proceed directly with the update operation
4. Don't ask for confirmation - just proceed with the update operation

Examples:
- "Create a task to call mom tomorrow" → Create task with due_date = "tomorrow", urgency = P3
- "Create a task for next Monday" → Create task with due_date = "next monday", urgency = P3
- "Create 10 random tasks" → Use create_multiple_tasks with count = 10, base_title = "Task"
- "Create 5 different tasks" → Use create_multiple_tasks with count = 5, base_title = "Task"
- "Mark all P3 tasks as completed" → Call update_task with status = "Completed" (no task_id needed)
- "Reset all tasks to P3" → Call update_task with urgency = "P3" (no task_id needed)
- "Change all tasks to high priority" → Call update_task with urgency = "P2" (no task_id needed)
- "Set all tasks to medium priority" → Call update_task with urgency = "P3" (no task_id needed)
- "Change the date of all tasks to next week monday" → Call update_task with due_date = "next monday" (no task_id needed)
- "What's my highest priority task?" → Get tasks and identify the P1 task
- "Delete the task called 'test task'" → Find and delete the specific task

For bulk operations, use update_task WITHOUT a task_id to update all matching tasks.

IMPORTANT:
- When changing priority levels, ONLY update the urgency field. Do NOT change the status unless specifically asked to mark tasks as completed.
- When creating multiple tasks, each task must have a UNIQUE title. Use numbers, descriptions, or different names to make each task distinct.
- For bulk operations (affecting multiple tasks), don't specify a task_id - the system will update all matching tasks automatically.`
      },
      {
        role: 'user',
        content: message
      }
    ];

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages as any,
      tools: tools,
      tool_choice: 'auto'
    });

    const assistantMessage = response.choices[0].message;

    // Handle tool calls
    if (assistantMessage.tool_calls) {
      let finalResult = '';

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        try {
          const toolResult = await executeTool(toolName, toolArgs, userId, userToken);

          // Add tool result to conversation
          messages.push({
            role: 'assistant',
            content: assistantMessage.content || '',
            tool_calls: [toolCall]
          } as any);

          messages.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id
          } as any);

          finalResult += `${toolResult}\n`;
        } catch (error) {
          console.error(`Tool execution error for ${toolName}:`, error);
          finalResult += `Error executing ${toolName}: ${error.message}\n`;
        }
      }

      // Get final response from OpenAI
      const finalResponse = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages as any,
        tools: tools
      });

      const finalMessage = finalResponse.choices[0].message.content || finalResult;

      res.json({
        success: true,
        result: finalMessage
      });
    } else {
      // No tool calls, just return the assistant's response
      res.json({
        success: true,
        result: assistantMessage.content || 'I understand your request.'
      });
    }

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI request failed'
    });
  }
}));

export default router;

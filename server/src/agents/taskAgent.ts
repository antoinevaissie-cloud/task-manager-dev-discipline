import { Agent, tool } from '@openai/agents';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    process.env.SUPABASE_URL || 'https://ihheipfihcgtzhujcmdn.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '***REMOVED_SUPABASE_SERVICE_ROLE_KEY***'
  );
};

// Helper function to parse relative dates
function parseRelativeDate(dateStr: string): Date {
  const today = new Date();
  const lowerDate = dateStr.toLowerCase();

  if (lowerDate.includes('monday')) {
    const daysUntilMonday = (1 - today.getDay() + 7) % 7;
    return new Date(today.getTime() + (daysUntilMonday || 7) * 24 * 60 * 60 * 1000);
  } else if (lowerDate.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  } else if (lowerDate.includes('today')) {
    return today;
  }

  const parsedDate = new Date(dateStr);
  return isNaN(parsedDate.getTime()) ? today : parsedDate;
}

// Tool: Get Tasks
export const getTasksTool = tool({
  name: 'get_tasks',
  description: 'Retrieve all open tasks for the user',
  parameters: z.object({
    status: z.enum(['Open', 'Completed']).nullable().describe('Filter by status'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    let query = supabase
      .from('tasks')
      .select('id, title, description, status, urgency, due_date, project_id, created_at')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });

    if (input.status) {
      query = query.eq('status', input.status);
    } else {
      query = query.eq('status', 'Open');
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return tasks;
  },
});

// Tool: Create Task
export const createTaskTool = tool({
  name: 'create_task',
  description: 'Create a new task',
  parameters: z.object({
    title: z.string().describe('Task title'),
    description: z.string().nullable().describe('Task description'),
    urgency: z.enum(['P1', 'P2', 'P3', 'P4']).nullable().describe('Priority level'),
    due_date: z.string().nullable().describe('Due date (e.g., "tomorrow", "next monday", or specific date)'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    const dueDate = input.due_date ? parseRelativeDate(input.due_date) : new Date();

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description || null,
        urgency: input.urgency || 'P3',
        due_date: dueDate.toISOString().split('T')[0],
        status: 'Open',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return newTask;
  },
});

// Tool: Create Multiple Tasks
export const createMultipleTasksTool = tool({
  name: 'create_multiple_tasks',
  description: 'Create multiple tasks at once',
  parameters: z.object({
    count: z.number().describe('Number of tasks to create'),
    base_title: z.string().nullable().describe('Base title for tasks (will be numbered)'),
    urgency: z.enum(['P1', 'P2', 'P3', 'P4']).nullable().describe('Priority level'),
    due_date: z.string().nullable().describe('Due date for all tasks'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    const dueDate = input.due_date ? parseRelativeDate(input.due_date) : new Date();
    const baseTitle = input.base_title || 'Task';
    const urgency = input.urgency || 'P3';

    const tasksToCreate = [];
    for (let i = 1; i <= input.count; i++) {
      tasksToCreate.push({
        user_id: userId,
        title: `${baseTitle} ${i}`,
        description: null,
        urgency: urgency,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'Open',
      });
    }

    const { data: createdTasks, error } = await supabase
      .from('tasks')
      .insert(tasksToCreate)
      .select();

    if (error) {
      throw new Error(`Failed to create tasks: ${error.message}`);
    }

    return createdTasks;
  },
});

// Tool: Update Task
export const updateTaskTool = tool({
  name: 'update_task',
  description: 'Update one or more tasks. If task_id is provided, updates a single task. If not, updates all matching tasks.',
  parameters: z.object({
    task_id: z.string().nullable().describe('Specific task ID to update (omit for bulk updates)'),
    title: z.string().nullable().describe('New title'),
    description: z.string().nullable().describe('New description'),
    urgency: z.enum(['P1', 'P2', 'P3', 'P4']).nullable().describe('New priority'),
    due_date: z.string().nullable().describe('New due date'),
    status: z.enum(['Open', 'Completed']).nullable().describe('New status'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    const updateData: any = {};
    if (input.title) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.urgency) updateData.urgency = input.urgency;
    if (input.due_date) {
      const dueDate = parseRelativeDate(input.due_date);
      updateData.due_date = dueDate.toISOString().split('T')[0];
    }
    if (input.status) {
      updateData.status = input.status;
      if (input.status === 'Completed') {
        updateData.completed_date = new Date().toISOString();
      }
    }

    // Bulk update (no task_id)
    if (!input.task_id) {
      const { data: updatedTasks, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('user_id', userId)
        .eq('status', 'Open')
        .select();

      if (error) {
        throw new Error(`Failed to update tasks: ${error.message}`);
      }

      return { updated_count: updatedTasks.length, tasks: updatedTasks };
    }

    // Single task update
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', input.task_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return updatedTask;
  },
});

// Tool: Delete Task
export const deleteTaskTool = tool({
  name: 'delete_task',
  description: 'Delete a specific task',
  parameters: z.object({
    task_id: z.string().describe('ID of the task to delete'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', input.task_id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return { success: true, message: `Task ${input.task_id} deleted successfully` };
  },
});

// Task Management Agent
export const taskAgent = new Agent({
  name: 'Task Manager',
  instructions: `You are a task management agent. Your role is to handle all CRUD operations for tasks.

You can:
- Get tasks (filter by status if needed)
- Create single tasks or multiple tasks at once
- Update tasks (single or bulk updates)
- Delete tasks

For dates, you understand relative terms like "tomorrow", "next monday", "today", etc.
For bulk operations, omit the task_id parameter to update all matching tasks.

Be efficient and provide clear confirmations of actions taken.`,
  tools: [
    getTasksTool,
    createTaskTool,
    createMultipleTasksTool,
    updateTaskTool,
    deleteTaskTool,
  ],
  handoffDescription: 'You manage all task CRUD operations and basic organization',
});

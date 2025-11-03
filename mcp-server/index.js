#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Initialize Supabase client with service role for full access
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Create MCP server
const server = new Server(
  {
    name: 'task-manager-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools for task management
server.setRequestHandler({ method: 'tools/list' }, async () => {
  return {
    tools: [
      {
        name: 'get_tasks',
        description: 'Get tasks from the task manager. Can filter by status, urgency, due_date, or project.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by task status',
              enum: ['Open', 'Completed']
            },
            urgency: {
              type: 'string',
              description: 'Filter by priority level',
              enum: ['P1', 'P2', 'P3', 'P4']
            },
            due_date: {
              type: 'string',
              description: 'Filter by due date (YYYY-MM-DD format)',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$'
            },
            project_id: {
              type: 'string',
              description: 'Filter by project ID'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'create_task',
        description: 'Create a new task in the task manager.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title (required)',
              minLength: 1
            },
            description: {
              type: 'string',
              description: 'Task description (optional)'
            },
            urgency: {
              type: 'string',
              description: 'Priority level',
              enum: ['P1', 'P2', 'P3', 'P4'],
              default: 'P3'
            },
            due_date: {
              type: 'string',
              description: 'Due date in YYYY-MM-DD format (defaults to today)',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$'
            },
            project_id: {
              type: 'string',
              description: 'Project ID (optional)'
            }
          },
          required: ['title'],
          additionalProperties: false
        }
      },
      {
        name: 'update_task',
        description: 'Update an existing task.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'ID of the task to update'
            },
            title: {
              type: 'string',
              description: 'New task title'
            },
            description: {
              type: 'string',
              description: 'New task description'
            },
            status: {
              type: 'string',
              description: 'Task status',
              enum: ['Open', 'Completed']
            },
            urgency: {
              type: 'string',
              description: 'Priority level',
              enum: ['P1', 'P2', 'P3', 'P4']
            },
            due_date: {
              type: 'string',
              description: 'Due date in YYYY-MM-DD format',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$'
            },
            project_id: {
              type: 'string',
              description: 'Project ID'
            }
          },
          required: ['task_id'],
          additionalProperties: false
        }
      },
      {
        name: 'get_projects',
        description: 'Get all projects from the task manager.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'create_project',
        description: 'Create a new project.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name (required)',
              minLength: 1
            },
            description: {
              type: 'string',
              description: 'Project description (optional)'
            }
          },
          required: ['name'],
          additionalProperties: false
        }
      }
    ]
  };
});

// Handle tool execution
server.setRequestHandler({ method: 'tools/call' }, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_tasks': {
        let query = supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            status,
            urgency,
            due_date,
            created_at,
            projects (
              id,
              name
            )
          `)
          .order('due_date', { ascending: true })
          .order('urgency', { ascending: true });

        // Apply filters
        if (args.status) {
          query = query.eq('status', args.status);
        }
        if (args.urgency) {
          query = query.eq('urgency', args.urgency);
        }
        if (args.due_date) {
          query = query.eq('due_date', args.due_date);
        }
        if (args.project_id) {
          query = query.eq('project_id', args.project_id);
        }

        const { data: tasks, error } = await query;

        if (error) {
          throw new Error(`Failed to fetch tasks: ${error.message}`);
        }

        // Format tasks for better readability
        const formattedTasks = tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.urgency,
          due_date: task.due_date,
          project: task.projects?.name || 'No Project',
          created_at: task.created_at
        }));

        return {
          content: [
            {
              type: 'text',
              text: `Found ${formattedTasks.length} tasks:\n\n${JSON.stringify(formattedTasks, null, 2)}`
            }
          ]
        };
      }

      case 'create_task': {
        const taskData = {
          title: args.title,
          description: args.description || null,
          urgency: args.urgency || 'P3',
          due_date: args.due_date || new Date().toISOString().split('T')[0],
          status: 'Open',
          project_id: args.project_id || null
        };

        const { data: task, error } = await supabase
          .from('tasks')
          .insert([taskData])
          .select(`
            id,
            title,
            description,
            status,
            urgency,
            due_date,
            projects (
              id,
              name
            )
          `)
          .single();

        if (error) {
          throw new Error(`Failed to create task: ${error.message}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task created successfully!\n\n${JSON.stringify({
                id: task.id,
                title: task.title,
                description: task.description || '',
                status: task.status,
                priority: task.urgency,
                due_date: task.due_date,
                project: task.projects?.name || 'No Project'
              }, null, 2)}`
            }
          ]
        };
      }

      case 'update_task': {
        const { task_id, ...updateData } = args;

        // Remove undefined values
        const cleanUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );

        if (Object.keys(cleanUpdateData).length === 0) {
          throw new Error('No fields provided to update');
        }

        const { data: task, error } = await supabase
          .from('tasks')
          .update(cleanUpdateData)
          .eq('id', task_id)
          .select(`
            id,
            title,
            description,
            status,
            urgency,
            due_date,
            projects (
              id,
              name
            )
          `)
          .single();

        if (error) {
          throw new Error(`Failed to update task: ${error.message}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task updated successfully!\n\n${JSON.stringify({
                id: task.id,
                title: task.title,
                description: task.description || '',
                status: task.status,
                priority: task.urgency,
                due_date: task.due_date,
                project: task.projects?.name || 'No Project'
              }, null, 2)}`
            }
          ]
        };
      }

      case 'get_projects': {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, name, description')
          .order('name', { ascending: true });

        if (error) {
          throw new Error(`Failed to fetch projects: ${error.message}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Found ${projects.length} projects:\n\n${JSON.stringify(projects, null, 2)}`
            }
          ]
        };
      }

      case 'create_project': {
        const projectData = {
          name: args.name,
          description: args.description || null
        };

        const { data: project, error } = await supabase
          .from('projects')
          .insert([projectData])
          .select('id, name, description')
          .single();

        if (error) {
          throw new Error(`Failed to create project: ${error.message}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Project created successfully!\n\n${JSON.stringify(project, null, 2)}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Task Manager MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});

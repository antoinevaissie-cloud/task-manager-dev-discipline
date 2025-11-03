#!/usr/bin/env node

// Simple MCP server for task management
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://ihheipfihcgtzhujcmdn.supabase.co';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with your actual key

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Simple HTTP server for ChatKit to connect to
import { createServer } from 'http';
import { parse } from 'url';

const server = createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const { pathname, query } = parse(req.url, true);

  try {
    if (pathname === '/get_tasks') {
      const { data: tasks, error } = await supabase
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
        .order('due_date', { ascending: true });

      if (error) throw error;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tasks || []));
    }
    else if (pathname === '/create_task') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const taskData = JSON.parse(body);

          const { data: task, error } = await supabase
            .from('tasks')
            .insert([{
              title: taskData.title,
              description: taskData.description || null,
              urgency: taskData.urgency || 'P3',
              due_date: taskData.due_date || new Date().toISOString().split('T')[0],
              status: 'Open',
              project_id: taskData.project_id || null
            }])
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

          if (error) throw error;

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(task));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`🚀 Simple MCP server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /get_tasks - Get all tasks`);
  console.log(`   POST /create_task - Create a new task`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

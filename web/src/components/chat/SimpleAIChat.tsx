import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SimpleAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const SimpleAIChat: React.FC<SimpleAIChatProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your AI task assistant. I can help you:\n\n• View your tasks ("show my tasks today")\n• Create new tasks ("create a task to call mom tomorrow")\n• Update tasks ("mark grocery shopping as completed")\n• Manage projects ("create a project called Home Renovation")\n\nWhat would you like to do?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const callOpenAI = async (userMessage: string, taskContext: string = '') => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || '***REMOVED_OPENAI_KEY***'}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an intelligent task management assistant. You help users by understanding their requests and taking appropriate actions.

Priority levels: P1 (highest/urgent), P2 (high), P3 (medium), P4 (low)

Current tasks context: ${taskContext}

IMPORTANT: You have two modes:
1. **ACTION MODE**: When user wants to create/update tasks → respond with JSON
2. **ANALYSIS MODE**: When user asks questions about tasks → respond naturally

ACTION MODE - Use JSON when user wants to:
- Create a task: {"action": "create_task", "title": "...", "urgency": "P3", "due_date": "2025-10-15"}
- Update a task: {"action": "update_task", "task_id": "TASK_UUID_HERE", "status": "Completed"}
  IMPORTANT: Always use the exact task ID (UUID) from the task context, never the task title!

ANALYSIS MODE - Respond naturally when user asks:
- "What's my highest priority task?" → {"action": "get_tasks"}
- "Show me today's tasks" → {"action": "get_tasks"}
- "How many tasks do I have?" → {"action": "get_tasks"}

Examples:
- User: "Create a task to call mom tomorrow" → JSON with create_task action
- User: "What's my highest priority task today?" → JSON with get_tasks action
- User: "How are you?" → Natural response (no action needed)

Be intelligent and helpful in all responses.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const executeAction = async (actionData: any) => {
    try {
      switch (actionData.action) {
        case 'get_tasks': {
          const { data: tasks, error } = await supabase
            .from('tasks')
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
            .order('due_date', { ascending: true });

          if (error) throw error;

          const formattedTasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.urgency,
            due_date: task.due_date,
            project: task.projects?.name || 'No Project'
          }));

          return `Found ${formattedTasks.length} tasks:\n\n${JSON.stringify(formattedTasks, null, 2)}`;
        }

        case 'create_task': {
          // Check current user session first
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error('You must be logged in to create tasks');
          }

          console.log('Creating task for user:', user.id);

          const taskData = {
            title: actionData.title,
            description: actionData.description || null,
            urgency: actionData.urgency || 'P3',
            due_date: actionData.due_date || new Date().toISOString().split('T')[0],
            status: 'Open',
            user_id: user.id // Make sure user_id is set
          };

          console.log('Task data:', taskData);
          console.log('Current session:', await supabase.auth.getSession());

          const { data: task, error } = await supabase
            .from('tasks')
            .insert([taskData])
            .select(`
              id,
              title,
              description,
              status,
              urgency,
              due_date
            `)
            .single();

          if (error) {
            console.error('Task creation error:', error);
            throw error;
          }

          onTaskCreated?.();
          return `✅ Task created successfully!\n\nTitle: ${task.title}\nPriority: ${task.urgency}\nDue Date: ${task.due_date}`;
        }

        case 'update_task': {
          console.log('Executing update_task:', actionData);

          // Check current user session first
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error('You must be logged in to update tasks');
          }

          console.log('Updating task:', actionData.task_id, 'to status:', actionData.status);

          const { data: task, error } = await supabase
            .from('tasks')
            .update({
              status: actionData.status,
              completed_date: actionData.status === 'Completed' ? new Date().toISOString() : null
            })
            .eq('id', actionData.task_id)
            .eq('user_id', user.id) // Ensure user can only update their own tasks
            .select()
            .single();

          console.log('Update result:', { task, error });

          if (error) {
            console.error('Supabase update error:', error);
            throw error;
          }

          onTaskCreated?.();
          return `✅ Task "${task.title}" marked as ${task.status}`;
        }

        case 'get_projects': {
          const { data: projects, error } = await supabase
            .from('projects')
            .select('id, name, description')
            .order('name', { ascending: true });

          if (error) throw error;

          return `Here are your projects:\n\n${projects.map(project =>
            `• ${project.name}${project.description ? ` - ${project.description}` : ''}`
          ).join('\n')}`;
        }

        default:
          return 'I don\'t understand that action.';
      }
    } catch (error) {
      console.error('Error executing action:', error);
      return `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  const handleSendMessage = async (content: string) => {
    console.log('🚀 NEW VERSION - handleSendMessage called with:', content);
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // First check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessages(prev => [...prev, {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: '⚠️ You must be logged in to use the AI assistant. Please log in and try again.'
        }]);
        setIsLoading(false);
        return;
      }

      // Get current tasks for context
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, urgency, due_date')
        .limit(10);

      const taskContext = tasks ? tasks.map(t =>
        `ID: ${t.id} | Title: ${t.title} | Priority: ${t.urgency} | Due: ${t.due_date} | Status: ${t.status}`
      ).join('\n') : 'No tasks';

      // Call OpenAI
      const aiResponse = await callOpenAI(content.trim(), taskContext);

      // Try to parse as JSON action(s)
      let responseText = aiResponse;
      try {
        // Check if response contains multiple JSON objects (one per line)
        const lines = aiResponse.trim().split('\n');
        const actions = [];

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
            try {
              const actionData = JSON.parse(trimmedLine);
              if (actionData.action) {
                actions.push(actionData);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }

        if (actions.length > 0) {
          // Execute all actions
          const results = [];
          for (const actionData of actions) {
            try {
              const result = await executeAction(actionData);
              results.push(result);
            } catch (error) {
              console.error('Error executing action:', error);
              const errorMessage = error instanceof Error ? error.message : String(error);
              results.push(`❌ Error executing ${actionData.action}: ${errorMessage}`);
            }
          }
          responseText = `✅ Completed ${actions.length} action(s):\n${results.join('\n')}`;
        } else {
          // Try to parse as single JSON object
          const actionData = JSON.parse(aiResponse);
          if (actionData.action) {
            if (actionData.action === 'get_tasks') {
              // Get tasks and let AI provide intelligent analysis
              const taskData = await executeAction(actionData);
              const intelligentResponse = await callOpenAI(
                `The user asked: "${content.trim()}"\n\nHere are their tasks:\n${taskData}\n\nProvide a helpful, intelligent response that addresses what they asked for. Be conversational and insightful.`,
                ''
              );
              responseText = intelligentResponse;
            } else {
              responseText = await executeAction(actionData);
            }
          }
        }
      } catch {
        // Not JSON, use as regular response
      }

      setMessages(prev => [...prev, {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: responseText
      }]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: `❌ Error: ${errorMessage}\n\nPlease try again or check the console for more details.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      handleSendMessage(textarea.value);
      textarea.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Task Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <textarea
              placeholder="Ask me to create a task, show your tasks, or help with project management..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              onClick={() => {
                const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                if (textarea) {
                  handleSendMessage(textarea.value);
                  textarea.value = '';
                }
              }}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Force refresh Tue Oct 14 22:17:40 CEST 2025

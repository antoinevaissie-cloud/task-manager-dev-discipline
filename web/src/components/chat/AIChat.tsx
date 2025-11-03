import React, { useState, useRef, useEffect } from 'react';
import { ChatKit } from '@openai/chatkit';
import { Message } from '@openai/chatkit/types';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your AI task assistant. I can help you:\n\n• View your tasks ("show my tasks today")\n• Create new tasks ("create a task to call mom tomorrow")\n• Update tasks ("mark grocery shopping as completed")\n• Manage projects ("create a project called Home Renovation")\n\nWhat would you like to do?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatKitRef = useRef<ChatKit | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize ChatKit when chat opens
      const initializeChatKit = async () => {
        try {
          // Configure ChatKit with your OpenAI API key and MCP server
          chatKitRef.current = new ChatKit({
            apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'your-openai-api-key',
            model: 'gpt-4',
            tools: [
              // Define the tools that match your MCP server
              {
                type: 'function',
                function: {
                  name: 'get_tasks',
                  description: 'Get tasks from the task manager',
                  parameters: {
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
                        description: 'Filter by due date (YYYY-MM-DD format)'
                      }
                    }
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
                        description: 'Task title (required)'
                      },
                      description: {
                        type: 'string',
                        description: 'Task description (optional)'
                      },
                      urgency: {
                        type: 'string',
                        description: 'Priority level',
                        enum: ['P1', 'P2', 'P3', 'P4']
                      },
                      due_date: {
                        type: 'string',
                        description: 'Due date in YYYY-MM-DD format'
                      }
                    },
                    required: ['title']
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
                        description: 'ID of the task to update'
                      },
                      title: {
                        type: 'string',
                        description: 'New task title'
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
                      }
                    },
                    required: ['task_id']
                  }
                }
              }
            ],
            // Connect to your MCP server
            mcpServer: {
              url: 'http://localhost:3001', // Your MCP server URL
              transport: 'stdio'
            }
          });

          // Set up message handlers
          chatKitRef.current.onMessage((message) => {
            setMessages(prev => [...prev, message]);
            setIsLoading(false);

            // Trigger refresh if a task was created/updated
            if (message.role === 'assistant' &&
                (message.content.includes('created') || message.content.includes('updated'))) {
              onTaskCreated?.();
            }
          });

        } catch (error) {
          console.error('Failed to initialize ChatKit:', error);
          setMessages(prev => [...prev, {
            id: 'error',
            role: 'assistant',
            content: 'Sorry, I couldn\'t connect to the AI service. Please try again later.'
          }]);
        }
      };

      initializeChatKit();
    }

    return () => {
      // Cleanup
      if (chatKitRef.current) {
        chatKitRef.current.destroy();
        chatKitRef.current = null;
      }
    };
  }, [isOpen, onTaskCreated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (chatKitRef.current) {
        await chatKitRef.current.sendMessage(content.trim());
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }]);
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


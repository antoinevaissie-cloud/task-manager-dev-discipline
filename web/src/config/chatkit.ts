// ChatKit configuration
export const chatKitConfig = {
  // OpenAI API Key - add this to your .env file as REACT_APP_OPENAI_API_KEY
  apiKey: process.env.REACT_APP_OPENAI_API_KEY || 'your-openai-api-key-here',

  // Model to use
  model: 'gpt-4',

  // MCP Server URL
  mcpServerUrl: process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001',

  // System prompt for the AI assistant
  systemPrompt: `You are a helpful task management assistant. You can help users:

1. **View Tasks**: Show tasks by date, priority, or status
2. **Create Tasks**: Create new tasks with title, description, priority, and due date
3. **Update Tasks**: Mark tasks as completed, change priority, or update details
4. **Manage Projects**: Create and view projects

Always be helpful and provide clear, actionable responses. When creating tasks, suggest appropriate priorities and due dates if not specified.`
};


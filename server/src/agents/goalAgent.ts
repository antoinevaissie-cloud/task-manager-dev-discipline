import { Agent, tool } from '@openai/agents';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Tool: Analyze Task Priorities
export const analyzePrioritiesTool = tool({
  name: 'analyze_priorities',
  description: 'Analyze task priorities and provide intelligent recommendations based on urgency, due dates, and goals',
  parameters: z.object({
    context: z.string().nullable().describe('Additional context about goals or priorities'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    // Get all open tasks
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, description, urgency, due_date, created_at')
      .eq('user_id', userId)
      .eq('status', 'Open')
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    // Analyze tasks
    const today = new Date();
    const analysis = {
      total_tasks: tasks.length,
      urgent_tasks: tasks.filter(t => t.urgency === 'P1').length,
      high_priority: tasks.filter(t => t.urgency === 'P2').length,
      medium_priority: tasks.filter(t => t.urgency === 'P3').length,
      low_priority: tasks.filter(t => t.urgency === 'P4').length,
      overdue_tasks: tasks.filter(t => new Date(t.due_date) < today).length,
      due_this_week: tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return dueDate >= today && dueDate <= weekFromNow;
      }).length,
      tasks_by_priority: tasks.map(t => ({
        id: t.id,
        title: t.title,
        urgency: t.urgency,
        due_date: t.due_date,
        days_until_due: Math.ceil((new Date(t.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })),
      context: input.context || 'No additional context provided'
    };

    return analysis;
  },
});

// Tool: Suggest Prioritization
export const suggestPrioritizationTool = tool({
  name: 'suggest_prioritization',
  description: 'Provide AI-driven suggestions for task prioritization based on analysis',
  parameters: z.object({
    focus_area: z.string().nullable().describe('Specific area to focus prioritization on'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, description, urgency, due_date')
      .eq('user_id', userId)
      .eq('status', 'Open')
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    const today = new Date();

    // Generate prioritization suggestions
    const suggestions = {
      should_do_today: tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return (t.urgency === 'P1' || t.urgency === 'P2') && daysUntil <= 1;
      }),
      should_do_this_week: tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil > 1 && daysUntil <= 7 && (t.urgency === 'P1' || t.urgency === 'P2' || t.urgency === 'P3');
      }),
      can_defer: tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil > 7 && t.urgency === 'P4';
      }),
      needs_reprioritization: tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return (daysUntil <= 2 && (t.urgency === 'P3' || t.urgency === 'P4')) || (daysUntil < 0);
      }),
      focus_area: input.focus_area || 'general productivity'
    };

    return suggestions;
  },
});

// Tool: Evaluate Goal Alignment
export const evaluateGoalAlignmentTool = tool({
  name: 'evaluate_goal_alignment',
  description: 'Evaluate how well current tasks align with stated goals and provide insights',
  parameters: z.object({
    goals: z.array(z.string()).describe('List of long-term goals to evaluate against'),
  }),
  execute: async (input, context) => {
    const supabase = getSupabaseClient();
    const userId = context.userId;

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, description, urgency')
      .eq('user_id', userId)
      .eq('status', 'Open');

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    // Analyze goal alignment
    const evaluation = {
      stated_goals: input.goals,
      total_tasks: tasks.length,
      high_priority_tasks: tasks.filter(t => t.urgency === 'P1' || t.urgency === 'P2').length,
      task_list: tasks.map(t => ({
        title: t.title,
        description: t.description,
        urgency: t.urgency
      })),
      recommendation: `Based on your ${input.goals.length} stated goals and ${tasks.length} open tasks, I can help you identify which tasks align with your objectives and which might be distractions.`
    };

    return evaluation;
  },
});

// Goal Strategy Agent
export const goalAgent = new Agent({
  name: 'Goal Strategist',
  instructions: `You are a strategic goal alignment agent. Your role is to:

1. **Analyze task priorities** - Evaluate the urgency and importance of tasks
2. **Suggest prioritization** - Provide intelligent recommendations on what to focus on
3. **Evaluate goal alignment** - Help users understand if their tasks align with long-term goals

You understand:
- The difference between urgent and important
- How to balance short-term tasks with long-term objectives
- When tasks should be reprioritized based on deadlines and urgency
- How to identify tasks that might not align with stated goals

Provide thoughtful, strategic advice that helps users make better decisions about their time and priorities.
Be specific, actionable, and insightful in your recommendations.`,
  tools: [
    analyzePrioritiesTool,
    suggestPrioritizationTool,
    evaluateGoalAlignmentTool,
  ],
  handoffDescription: 'You provide strategic analysis and intelligent prioritization recommendations',
});

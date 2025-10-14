import { supabase } from '@/lib/supabase';
import type { Task, Project, TaskFilters, TaskActionPayload } from '@/types/task';

export interface SupabaseTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string;
  urgency: string;
  project_id: string | null;
  created_at: string;
  completed_date: string | null;
  follow_up_item: boolean;
  url1: string | null;
  url2: string | null;
  url3: string | null;
  updated_at: string;
  project?: {
    id: string;
    name: string;
    description: string | null;
  };
}

// Convert Supabase task to frontend Task type
function convertToTask(sbTask: SupabaseTask): Task {
  return {
    id: sbTask.id,
    title: sbTask.title,
    description: sbTask.description || '',
    status: sbTask.status as 'Open' | 'Completed',
    dueDate: sbTask.due_date,
    urgency: sbTask.urgency as 'P1' | 'P2' | 'P3' | 'P4',
    projectId: sbTask.project_id || undefined,
    projectName: sbTask.project?.name,
    createdAt: sbTask.created_at,
    completedDate: sbTask.completed_date || undefined,
    followUpItem: sbTask.follow_up_item,
    url1: sbTask.url1 || undefined,
    url2: sbTask.url2 || undefined,
    url3: sbTask.url3 || undefined,
  };
}

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      project:projects (
        id,
        name,
        description
      )
    `)
    .order('due_date', { ascending: true })
    .order('urgency', { ascending: true });

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters?.projectId) {
    if (filters.projectId === '__unassigned__') {
      query = query.is('project_id', null);
    } else {
      query = query.eq('project_id', filters.projectId);
    }
  }

  if (filters?.from) {
    query = query.gte('due_date', filters.from);
  }

  if (filters?.to) {
    query = query.lte('due_date', filters.to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(error.message);
  }

  return (data || []).map(convertToTask);
}

export async function getTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects (
        id,
        name,
        description
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching task:', error);
    throw new Error(error.message);
  }

  return convertToTask(data);
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: task.title!,
      description: task.description || null,
      status: task.status || 'Open',
      due_date: task.dueDate || new Date().toISOString(),
      urgency: task.urgency || 'P3',
      project_id: task.projectId || null,
      follow_up_item: task.followUpItem || false,
      url1: task.url1 || null,
      url2: task.url2 || null,
      url3: task.url3 || null,
    })
    .select(`
      *,
      project:projects (
        id,
        name,
        description
      )
    `)
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error(error.message);
  }

  return convertToTask(data);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const payload: any = {};

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.urgency !== undefined) payload.urgency = updates.urgency;
  if (updates.projectId !== undefined) payload.project_id = updates.projectId || null;
  if (updates.followUpItem !== undefined) payload.follow_up_item = updates.followUpItem;
  if (updates.url1 !== undefined) payload.url1 = updates.url1 || null;
  if (updates.url2 !== undefined) payload.url2 = updates.url2 || null;
  if (updates.url3 !== undefined) payload.url3 = updates.url3 || null;

  // Set completed_date if status changed to Completed
  if (updates.status === 'Completed') {
    payload.completed_date = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select(`
      *,
      project:projects (
        id,
        name,
        description
      )
    `)
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw new Error(error.message);
  }

  return convertToTask(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error(error.message);
  }
}

export async function movePriority(id: string, direction: 'up' | 'down'): Promise<Task> {
  // First get the current task
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('urgency')
    .eq('id', id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const priorities = ['P1', 'P2', 'P3', 'P4'];
  const currentIndex = priorities.indexOf(task.urgency);

  let newUrgency: string;
  if (direction === 'up') {
    newUrgency = currentIndex > 0 ? priorities[currentIndex - 1] : task.urgency;
  } else {
    newUrgency = currentIndex < 3 ? priorities[currentIndex + 1] : task.urgency;
  }

  return updateTask(id, { urgency: newUrgency as any });
}

export async function moveDate(id: string, offset: 'next_day' | 'two_days' | 'next_week'): Promise<Task> {
  const today = new Date();
  let newDate: Date;

  switch (offset) {
    case 'next_day':
      newDate = new Date(today);
      newDate.setDate(newDate.getDate() + 1);
      break;
    case 'two_days':
      newDate = new Date(today);
      newDate.setDate(newDate.getDate() + 2);
      break;
    case 'next_week':
      newDate = new Date(today);
      const daysUntilMonday = (8 - newDate.getDay()) % 7 || 7;
      newDate.setDate(newDate.getDate() + daysUntilMonday);
      break;
  }

  return updateTask(id, { dueDate: newDate.toISOString() });
}

export async function completeTask(id: string): Promise<Task> {
  return updateTask(id, {
    status: 'Completed',
    completedDate: new Date().toISOString(),
  });
}

// Projects API
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks:tasks(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error(error.message);
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    status: p.status,
    taskCount: p.tasks[0]?.count || 0,
    createdAt: p.created_at,
  }));
}

export async function createProject(project: Partial<Project>): Promise<Project> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      name: project.name!,
      description: project.description || null,
      status: project.status || 'Open',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    status: data.status,
    taskCount: 0,
    createdAt: data.created_at,
  };
}

// Realtime subscriptions
export function subscribeToTasks(callback: () => void) {
  const channel = supabase
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToProjects(callback: () => void) {
  const channel = supabase
    .channel('projects-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


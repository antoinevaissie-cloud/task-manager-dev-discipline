import api from '@/api/client';
import type {
  Task,
  TaskActionType,
  Urgency,
  Project,
  TaskStatus,
  ProjectStatus,
} from '@/types/task';

export type FetchTasksParams = {
  status?: TaskStatus | 'All';
  search?: string;
  from?: string;
  to?: string;
  projectId?: string;
};

export async function fetchTasks(params: FetchTasksParams = {}) {
  const response = await api.get<{ data: Task[] }>('/tasks', { params });
  return response.data.data;
}

export async function fetchTask(taskId: string) {
  const response = await api.get<{ data: Task }>(`/tasks/${taskId}`);
  return response.data.data;
}

export type CreateTaskPayload = {
  title: string;
  description?: string;
  dueDate?: string;
  urgency?: Urgency;
  projectId?: string;
  followUpItem?: boolean;
  url1?: string;
  url2?: string;
  url3?: string;
};

export async function createTask(payload: CreateTaskPayload) {
  const response = await api.post<{ data: Task }>('/tasks', payload);
  return response.data.data;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload> & {
  title?: string;
  status?: TaskStatus;
};

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const response = await api.patch<{ data: Task }>(`/tasks/${taskId}`, payload);
  return response.data.data;
}

export async function moveTaskPriority(taskId: string, direction: 'up' | 'down') {
  const response = await api.post<{ data: Task }>(`/tasks/${taskId}/actions/move-priority`, {
    direction,
  });
  return response.data.data;
}

export async function moveTaskDueDate(taskId: string, type: TaskActionType) {
  const response = await api.post<{ data: Task }>(`/tasks/${taskId}/actions/move-date`, { type });
  return response.data.data;
}

export async function completeTask(taskId: string) {
  const response = await api.post<{ data: Task }>(`/tasks/${taskId}/actions/complete`);
  return response.data.data;
}

export async function deleteTask(taskId: string) {
  await api.delete(`/tasks/${taskId}`);
}

export async function fetchProjects() {
  const response = await api.get<{ data: Project[] }>('/projects');
  return response.data.data;
}

export type CreateProjectPayload = {
  name: string;
  description?: string;
  status?: ProjectStatus;
};

export async function createProject(payload: CreateProjectPayload) {
  const response = await api.post<{ data: Project }>('/projects', payload);
  return response.data.data;
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as supabaseApi from '@/api/supabase-tasks';
import type { Task, TaskActionType, Project, TaskFilters } from '@/types/task';

export const tasksQueryKeys = {
  all: ['tasks'] as const,
  list: (params: TaskFilters = {}) => ['tasks', params] as const,
  detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
  projects: ['projects'] as const,
};

export function useTasks(params: TaskFilters) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: tasksQueryKeys.list(params),
    queryFn: () => supabaseApi.getTasks(params),
    staleTime: 10 * 1000,
  });

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = supabaseApi.subscribeToTasks(() => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    });

    return unsubscribe;
  }, [queryClient]);

  return query;
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? tasksQueryKeys.detail(taskId) : ['tasks', 'detail', 'unknown'],
    queryFn: () => supabaseApi.getTask(taskId as string),
    enabled: Boolean(taskId),
  });
}

export function useProjects() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: tasksQueryKeys.projects,
    queryFn: supabaseApi.getProjects,
  });

  // Set up real-time subscription
  useEffect(() => {
    const unsubscribe = supabaseApi.subscribeToProjects(() => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.projects });
    });

    return unsubscribe;
  }, [queryClient]);

  return query;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Project>) => supabaseApi.createProject(payload),
    onSuccess: (project) => {
      queryClient.setQueryData<Project[] | undefined>(tasksQueryKeys.projects, (old) => {
        if (!old) return [project];
        const next = [...old, project];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.projects });
      return project;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supabaseApi.createTask,
    onSuccess: (task) => {
      queryClient.setQueryData<Task[] | undefined>(tasksQueryKeys.list({ status: 'Open' }), (old) =>
        old ? [task, ...old] : [task],
      );
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Task>) => supabaseApi.updateTask(taskId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
      queryClient.setQueryData(tasksQueryKeys.detail(taskId), updated);
    },
  });
}

export function useMovePriority(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (direction: 'up' | 'down') => supabaseApi.movePriority(taskId, direction),
    onMutate: async (direction) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: tasksQueryKeys.all });
      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<Task[]>(key, (tasks) =>
          tasks
            ? tasks.map((task) =>
                task.id === taskId
                  ? { ...task, urgency: direction === 'up' ? promote(task.urgency) : demote(task.urgency) }
                  : task,
              )
            : tasks,
        );
      });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

export function useMoveDueDate(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type: TaskActionType) => {
      const offsetMap = {
        nextDay: 'next_day' as const,
        plusTwo: 'two_days' as const,
        nextWeek: 'next_week' as const,
      };
      return supabaseApi.moveDate(taskId, offsetMap[type]);
    },
    onMutate: async (type) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: tasksQueryKeys.all });
      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<Task[]>(key, (tasks) =>
          tasks
            ? tasks.map((task) =>
                task.id === taskId
                  ? { ...task, dueDate: adjustDueDate(task.dueDate, type) }
                  : task,
              )
            : tasks,
        );
      });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

export function useCompleteTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => supabaseApi.completeTask(taskId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKeys.all });
      const previous = queryClient.getQueriesData<Task[]>({ queryKey: tasksQueryKeys.all });
      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<Task[]>(key, (tasks) =>
          tasks ? tasks.filter((task) => task.id !== taskId) : tasks,
        );
      });
      return { previous };
    },
    onError: (_err, _variables, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

export function useDeleteTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => supabaseApi.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all });
    },
  });
}

function promote(urgency: Task['urgency']): Task['urgency'] {
  if (urgency === 'P1') return 'P1';
  if (urgency === 'P2') return 'P1';
  if (urgency === 'P3') return 'P2';
  return 'P3';
}

function demote(urgency: Task['urgency']): Task['urgency'] {
  if (urgency === 'P4') return 'P4';
  if (urgency === 'P3') return 'P4';
  if (urgency === 'P2') return 'P3';
  return 'P2';
}

function adjustDueDate(date: string, type: TaskActionType) {
  const current = new Date(date);
  const copy = new Date(current);
  if (type === 'nextDay') {
    copy.setDate(copy.getDate() + 1);
  } else if (type === 'plusTwo') {
    copy.setDate(copy.getDate() + 2);
  } else {
    const day = copy.getDay();
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
    copy.setDate(copy.getDate() + daysUntilMonday);
  }
  return copy.toISOString();
}

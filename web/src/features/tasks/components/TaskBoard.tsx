import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTasks } from '../hooks';
import type { Task } from '@/types/task';
import { toDateKey, formatDisplayDate } from '@/utils/date';
import { getSocket } from '@/realtime/socket';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { FiList, FiGrid } from 'react-icons/fi';
import TaskSidebar from './TaskSidebar';
import TaskTable from './TaskTable';
import TaskDetailDrawer from './TaskDetailDrawer';

type DateGroup = {
  key: string;
  label: string;
  count: number;
};

type TaskBoardProps = {
  onCreateTask?: () => void;
  onEditTask?: (task: Task) => void;
};

function TaskBoard({ onCreateTask, onEditTask }: TaskBoardProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const { data: tasks = [], isLoading } = useTasks({
    status: 'Open',
    search: debouncedSearch ? debouncedSearch : undefined,
  });

  useEffect(() => {
    const socket = getSocket();
    const invalidate = () =>
      queryClient.invalidateQueries({
        queryKey: ['tasks'],
      });

    socket.on('tasks:created', invalidate);
    socket.on('tasks:updated', invalidate);
    socket.on('tasks:completed', invalidate);
    socket.on('tasks:deleted', invalidate);

    return () => {
      socket.off('tasks:created', invalidate);
      socket.off('tasks:updated', invalidate);
      socket.off('tasks:completed', invalidate);
      socket.off('tasks:deleted', invalidate);
    };
  }, [queryClient]);

  useEffect(() => {
    if (selectedTaskId && !tasks.find((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [tasks, selectedTaskId]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const key = toDateKey(task.dueDate);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(task);
    });

    const dateGroups: DateGroup[] = Array.from(map.entries())
      .map(([key, items]) => ({
        key,
        label: formatDisplayDate(items[0].dueDate),
        count: items.length,
      }))
      .sort((a, b) => (a.key > b.key ? 1 : -1));

    const taskMap = map;
    return { dateGroups, taskMap };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (!selectedDateKey) {
      return tasks;
    }
    return grouped.taskMap.get(selectedDateKey) ?? [];
  }, [tasks, grouped.taskMap, selectedDateKey]);
  const visibleCount = visibleTasks.length;

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null),
    [tasks, selectedTaskId],
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <TaskSidebar
        groups={grouped.dateGroups}
        selectedDateKey={selectedDateKey}
        onSelectDate={setSelectedDateKey}
        onClearSelection={() => setSelectedDateKey(null)}
        highlightDateKey={todayKey}
      />

      <section className="relative flex-1 overflow-hidden bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex flex-1 items-center gap-3">
            <input
              type="search"
              placeholder="Search Open Tasks"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="hidden text-xs text-slate-500 md:block">
              Showing {visibleCount} of {tasks.length} tasks
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm">
              <ToggleButton
                icon={<FiList />}
                label="List view"
                isActive={viewMode === 'list'}
                onClick={() => setViewMode('list')}
              />
              <ToggleButton
                icon={<FiGrid />}
                label="Card view (coming soon)"
                isActive={viewMode === 'card'}
                onClick={() => setViewMode('card')}
                disabled
              />
            </div>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
              onClick={onCreateTask}
            >
              + Add
            </button>
          </div>
        </div>

        <TaskTable
          tasks={visibleTasks}
          isLoading={isLoading}
          onSelectTask={(taskId) =>
            setSelectedTaskId((current) => (current === taskId ? null : taskId))
          }
          selectedTaskId={selectedTaskId}
        />

        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onEdit={() => {
            if (selectedTask && onEditTask) {
              onEditTask(selectedTask);
            }
          }}
        />
      </section>
    </div>
  );
}

export default TaskBoard;

type ToggleButtonProps = {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
};

function ToggleButton({ icon, label, isActive, onClick, disabled }: ToggleButtonProps) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded ${
        isActive ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      {icon}
    </button>
  );
}

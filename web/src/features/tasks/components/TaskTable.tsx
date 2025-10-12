import TaskRow from './TaskRow';
import type { Task } from '@/types/task';

type TaskTableProps = {
  tasks: Task[];
  isLoading: boolean;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
};

function TaskTable({ tasks, isLoading, selectedTaskId, onSelectTask }: TaskTableProps) {
  const header = (
    <div className="grid grid-cols-[100px_200px_160px_minmax(200px,1fr)_160px] gap-2 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase text-slate-500">
      <div>Urgency</div>
      <div>Actions</div>
      <div>Due Date</div>
      <div>Title</div>
      <div>Project</div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-full overflow-y-hidden bg-white">
        {header}
        <div>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[100px_200px_160px_minmax(200px,1fr)_160px] items-center gap-2 px-6 py-3"
            >
              <Skeleton />
              <Skeleton />
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col bg-white">
        {header}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-slate-500">
            <p className="text-sm font-medium">No tasks to show.</p>
            <p className="text-xs">Try a different date or create a new task.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {header}

      <div>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            onSelect={() => onSelectTask(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default TaskTable;

function Skeleton() {
  return <div className="h-4 animate-pulse rounded bg-slate-200" />;
}

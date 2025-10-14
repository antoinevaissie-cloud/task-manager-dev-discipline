import { memo, useCallback, useEffect, useState } from 'react';
import {
  FiArrowUp,
  FiArrowDown,
  FiArrowRight,
  FiChevronsRight,
  FiCalendar,
  FiCheck,
} from 'react-icons/fi';
import type { Task } from '@/types/task';
import { formatDisplayDate } from '@/utils/date';
import {
  useCompleteTask,
  useMoveDueDate,
  useMovePriority,
  useUpdateTask,
} from '../hooks';

type TaskRowProps = {
  task: Task;
  isSelected: boolean;
  onSelect: () => void;
};

const urgencyStyles: Record<Task['urgency'], string> = {
  P1: 'text-red-600 font-semibold flex items-center gap-1',
  P2: 'text-yellow-600 font-semibold',
  P3: 'text-blue-600',
  P4: 'text-blue-500',
};

const urgencyLabel: Record<Task['urgency'], string> = {
  P1: '❗P1',
  P2: 'P2',
  P3: 'P3',
  P4: 'P4',
};

function TaskRow({ task, isSelected, onSelect }: TaskRowProps) {
  const movePriority = useMovePriority(task.id);
  const moveDueDate = useMoveDueDate(task.id);
  const complete = useCompleteTask(task.id);
  const updateTask = useUpdateTask(task.id);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState(task.dueDate.slice(0, 10));

  useEffect(() => {
    setDueDateDraft(task.dueDate.slice(0, 10));
  }, [task.dueDate]);

  const handleSelect = useCallback(() => {
    onSelect();
  }, [onSelect]);

  const runAction = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (error) {
        console.error(error);
      }
    },
    [],
  );

  const handleDueDateSubmit = useCallback(() => {
    if (!dueDateDraft) {
      setIsEditingDueDate(false);
      setDueDateDraft(task.dueDate.slice(0, 10));
      return;
    }

    if (dueDateDraft === task.dueDate.slice(0, 10)) {
      setIsEditingDueDate(false);
      return;
    }

    runAction(async () => {
      await updateTask.mutateAsync({ dueDate: dueDateDraft });
      setIsEditingDueDate(false);
    });
  }, [dueDateDraft, runAction, updateTask, task.dueDate]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleSelect();
        }
      }}
      className={`grid grid-cols-[100px_200px_160px_minmax(200px,1fr)_160px] items-center gap-2 px-6 py-3 text-sm transition ${
        isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
      }`}
    >
      <div className={urgencyStyles[task.urgency]}>{urgencyLabel[task.urgency]}</div>
      <div className="flex items-center gap-2">
        {task.urgency !== 'P1' ? (
          <ActionButton
            title="Increase priority"
            disabled={movePriority.isPending}
            icon={<FiArrowUp />}
            onClick={(event) => {
              event.stopPropagation();
              runAction(() => movePriority.mutateAsync('up'));
            }}
          />
        ) : null}
        {task.urgency !== 'P4' ? (
          <ActionButton
            title="Decrease priority"
            disabled={movePriority.isPending}
            icon={<FiArrowDown />}
            onClick={(event) => {
              event.stopPropagation();
              runAction(() => movePriority.mutateAsync('down'));
            }}
          />
        ) : null}
        <ActionButton
          title="Move to next day"
          disabled={moveDueDate.isPending}
          icon={<FiArrowRight />}
          onClick={(event) => {
            event.stopPropagation();
            runAction(() => moveDueDate.mutateAsync('nextDay'));
          }}
        />
        <ActionButton
          title="Move +2 days"
          disabled={moveDueDate.isPending}
          icon={<FiChevronsRight />}
          onClick={(event) => {
            event.stopPropagation();
            runAction(() => moveDueDate.mutateAsync('plusTwo'));
          }}
        />
        <ActionButton
          title="Move to next Monday"
          disabled={moveDueDate.isPending}
          icon={<FiCalendar />}
          onClick={(event) => {
            event.stopPropagation();
            runAction(() => moveDueDate.mutateAsync('nextMonday'));
          }}
        />
        <ActionButton
          title="Mark complete"
          disabled={complete.isPending}
          icon={<FiCheck />}
          onClick={(event) => {
            event.stopPropagation();
            runAction(() => complete.mutateAsync());
          }}
        />
      </div>
      <div className="text-sm">
        {isEditingDueDate ? (
          <input
            type="date"
            value={dueDateDraft}
            onChange={(event) => setDueDateDraft(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleDueDateSubmit();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setDueDateDraft(task.dueDate.slice(0, 10));
                setIsEditingDueDate(false);
              }
            }}
            onBlur={() => {
              handleDueDateSubmit();
            }}
            autoFocus
            className="rounded border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            className="rounded px-2 py-1 hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation();
              setIsEditingDueDate(true);
            }}
            title="Edit due date"
          >
            {formatDisplayDate(task.dueDate)}
          </button>
        )}
      </div>
      <div className="truncate text-sm text-slate-800">{task.title}</div>
      <div className="truncate text-sm text-slate-500">
        {task.project?.name ?? task.projectId ?? '—'}
      </div>
    </div>
  );
}

type ActionButtonProps = {
  title: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
};

function ActionButton({ title, icon, disabled, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-100 ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon}
    </button>
  );
}

export default memo(TaskRow);

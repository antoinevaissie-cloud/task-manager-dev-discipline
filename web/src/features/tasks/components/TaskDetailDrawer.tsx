import type { Task } from '@/types/task';
import { formatDisplayDate } from '@/utils/date';
import { FiX, FiEdit2, FiLink } from 'react-icons/fi';

type TaskDetailDrawerProps = {
  task: Task | null;
  onClose: () => void;
  onEdit?: () => void;
};

function TaskDetailDrawer({ task, onClose, onEdit }: TaskDetailDrawerProps) {
  const isVisible = Boolean(task);

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 flex w-96 transform flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="pointer-events-auto flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-sm font-semibold text-slate-700">Task Details</h2>
        <div className="flex items-center gap-2">
          {task ? (
            <button
              type="button"
              className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              onClick={onEdit}
            >
              <span className="mr-1 inline-flex items-center gap-1">
                <FiEdit2 />
                Edit
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className="pointer-events-auto flex-1 overflow-y-auto px-6 py-4">
        {task ? (
          <div className="space-y-6">
            <section>
              <p className="text-xs font-semibold uppercase text-slate-400">Title</p>
              <p className="mt-1 text-base font-medium text-slate-800">{task.title}</p>
              {task.description ? (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase text-slate-400">Description</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                    {task.description}
                  </p>
                </>
              ) : null}
            </section>

            <section className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Status</p>
                <p className="mt-1 text-slate-700">{task.status}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Due Date</p>
                <p className="mt-1 text-slate-700">{formatDisplayDate(task.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Urgency</p>
                <p className="mt-1 text-slate-700">{task.urgency}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Follow Up</p>
                <p className="mt-1 text-slate-700">{task.followUpItem ? 'Yes' : 'No'}</p>
              </div>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase text-slate-400">Project</p>
              <p className="mt-1 text-sm text-slate-700">
                {task.project?.name ?? task.projectId ?? '—'}
              </p>
            </section>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">Links</p>
              {[task.url1, task.url2, task.url3].filter(Boolean).length === 0 ? (
                <p className="text-sm text-slate-500">No links attached.</p>
              ) : null}
              {[task.url1, task.url2, task.url3].map((url, index) =>
                url ? (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <FiLink />
                    {`Link ${index + 1}`}
                  </a>
                ) : null,
              )}
            </section>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Select a task to view details.
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailDrawer;

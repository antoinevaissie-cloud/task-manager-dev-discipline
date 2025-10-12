import { useEffect, useMemo, useState } from 'react';
import type { Task, Urgency } from '@/types/task';
import { useCreateTask, useProjects, useUpdateTask } from '../hooks';
import { format } from 'date-fns';
import { FiX } from 'react-icons/fi';

type TaskFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  task?: Task | null;
  onClose: () => void;
};

type FormState = {
  title: string;
  description: string;
  dueDate: string;
  urgency: Urgency;
  projectId: string;
  followUpItem: boolean;
  url1: string;
  url2: string;
  url3: string;
};

const DEFAULT_FORM: FormState = {
  title: '',
  description: '',
  dueDate: format(new Date(), 'yyyy-MM-dd'),
  urgency: 'P3',
  projectId: '',
  followUpItem: false,
  url1: '',
  url2: '',
  url3: '',
};

function TaskFormDrawer({ open, mode, task, onClose }: TaskFormDrawerProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask(task?.id ?? '');

  useEffect(() => {
    if (!open) {
      setForm(DEFAULT_FORM);
      setError(null);
      return;
    }

    if (mode === 'edit' && task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        dueDate: task.dueDate.slice(0, 10),
        urgency: task.urgency,
        projectId: task.projectId ?? '',
        followUpItem: task.followUpItem,
        url1: task.url1 ?? '',
        url2: task.url2 ?? '',
        url3: task.url3 ?? '',
      });
    } else {
      setForm((prev) => ({
        ...DEFAULT_FORM,
        projectId: projects.length === 0 ? '' : prev.projectId,
      }));
    }
  }, [open, mode, task, projects.length]);

  const isSubmitting = createTask.isPending || updateTask.isPending;

  const drawerClass = useMemo(
    () =>
      `pointer-events-none absolute inset-y-0 right-0 flex w-[420px] transform flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`,
    [open],
  );

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      dueDate: form.dueDate,
      urgency: form.urgency,
      projectId: form.projectId || undefined,
      followUpItem: form.followUpItem,
      url1: form.url1.trim() || undefined,
      url2: form.url2.trim() || undefined,
      url3: form.url3.trim() || undefined,
    };

    try {
      if (mode === 'create') {
        await createTask.mutateAsync(payload);
      } else if (task) {
        await updateTask.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Unable to save task. Please try again.');
    }
  };

  return (
    <div className={drawerClass}>
      <div className="pointer-events-auto flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {mode === 'create' ? 'Add Task' : 'Edit Task'}
          </p>
          <p className="text-xs text-slate-400">Fields marked * are required.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
          onClick={onClose}
        >
          <FiX />
        </button>
      </div>

      <form
        className="pointer-events-auto flex-1 overflow-y-auto px-6 py-4 space-y-4"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="title">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(event) => handleChange('title', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label
            className="text-xs font-semibold uppercase text-slate-500"
            htmlFor="description"
          >
            Description
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="dueDate">
              Due Date *
            </label>
            <input
              id="dueDate"
              type="date"
              value={form.dueDate}
              onChange={(event) => handleChange('dueDate', event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="urgency">
              Urgency *
            </label>
            <select
              id="urgency"
              value={form.urgency}
              onChange={(event) => handleChange('urgency', event.target.value as Urgency)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="P1">P1 — Highest</option>
              <option value="P2">P2 — High</option>
              <option value="P3">P3 — Medium</option>
              <option value="P4">P4 — Low</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="projectId">
            Project
          </label>
          <select
            id="projectId"
            value={form.projectId}
            onChange={(event) => handleChange('projectId', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="followUpItem"
            type="checkbox"
            checked={form.followUpItem}
            onChange={(event) => handleChange('followUpItem', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="followUpItem" className="text-sm text-slate-700">
            Follow-up item
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-slate-500">Links</p>
          <input
            type="url"
            placeholder="URL 1"
            value={form.url1}
            onChange={(event) => handleChange('url1', event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="url"
            placeholder="URL 2"
            value={form.url2}
            onChange={(event) => handleChange('url2', event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="url"
            placeholder="URL 3"
            value={form.url3}
            onChange={(event) => handleChange('url3', event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save Task'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TaskFormDrawer;

import { useEffect, useMemo, useState } from 'react';
import { useCreateProject } from '../hooks';
import type { ProjectStatus, Project } from '@/types/task';

type ProjectCreateDrawerProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
};

type FormState = {
  name: string;
  description: string;
  status: ProjectStatus;
};

const STATUS_OPTIONS: ProjectStatus[] = ['Open', 'In Progress', 'Completed'];

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  status: 'Open',
};

function ProjectCreateDrawer({ open, onClose, onCreated }: ProjectCreateDrawerProps) {
  const createProject = useCreateProject();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(DEFAULT_FORM);
      setError(null);
    }
  }, [open]);

  const drawerClass = useMemo(
    () =>
      `pointer-events-none absolute inset-y-0 right-0 flex w-[360px] transform flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 ${
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
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        name: trimmedName,
        description: form.description.trim() || undefined,
        status: form.status,
      });
      onCreated(project);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Unable to create project. Please try again.');
    }
  };

  return (
    <div className={drawerClass}>
      <div className="pointer-events-auto flex h-14 items-center justify-between border-b border-slate-200 px-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">New Project</p>
          <p className="text-xs text-slate-400">Define a project to link related tasks.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        <div>
          <label htmlFor="projectName" className="text-xs font-semibold uppercase text-slate-500">
            Project Name *
          </label>
          <input
            id="projectName"
            type="text"
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g., Q4 Product Launch"
            required
          />
        </div>

        <div>
          <label
            htmlFor="projectDescription"
            className="text-xs font-semibold uppercase text-slate-500"
          >
            Description
          </label>
          <textarea
            id="projectDescription"
            value={form.description}
            onChange={(event) => handleChange('description', event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            rows={3}
            placeholder="Optional context or notes"
          />
        </div>

        <div>
          <label htmlFor="projectStatus" className="text-xs font-semibold uppercase text-slate-500">
            Status *
          </label>
          <select
            id="projectStatus"
            value={form.status}
            onChange={(event) => handleChange('status', event.target.value as ProjectStatus)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={createProject.isPending}
          >
            {createProject.isPending ? 'Saving…' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectCreateDrawer;

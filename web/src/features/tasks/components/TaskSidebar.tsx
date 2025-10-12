import { forwardRef, useEffect, useRef } from 'react';

type TaskSidebarProps = {
  groups: Array<{ key: string; label: string; count: number }>;
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
  onClearSelection: () => void;
  highlightDateKey?: string | null;
};

function TaskSidebar({
  groups,
  selectedDateKey,
  onSelectDate,
  onClearSelection,
  highlightDateKey,
}: TaskSidebarProps) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!highlightDateKey) return;
    const target = buttonRefs.current[highlightDateKey];
    if (target) {
      target.scrollIntoView({ block: 'center' });
    }
  }, [highlightDateKey, groups.length]);

  return (
    <aside className="w-72 border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
        Dates
      </div>
      <nav className="flex h-full flex-col overflow-y-auto">
        <SidebarButton
          isActive={selectedDateKey === null}
          label="All"
          count={total}
          onClick={onClearSelection}
        />
        {groups.map((group) => {
          const ref = (element: HTMLButtonElement | null) => {
            buttonRefs.current[group.key] = element;
          };
          return (
            <SidebarButton
              key={group.key}
              label={group.label}
              count={group.count}
              isActive={selectedDateKey === group.key}
              isHighlighted={highlightDateKey === group.key}
              onClick={() => onSelectDate(group.key)}
              ref={ref}
            />
          );
        })}
      </nav>
    </aside>
  );
}

type SidebarButtonProps = {
  label: string;
  count: number;
  isActive: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
};

const SidebarButton = forwardRef<HTMLButtonElement, SidebarButtonProps>(
  ({ label, count, isActive, isHighlighted, onClick }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        onClick={onClick}
        className={`flex items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-slate-100 ${
          isActive ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700'
        } ${isHighlighted && !isActive ? 'border-l-2 border-blue-200' : ''}`}
      >
        <span>{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {count}
        </span>
      </button>
    );
  },
);

SidebarButton.displayName = 'SidebarButton';

export default TaskSidebar;

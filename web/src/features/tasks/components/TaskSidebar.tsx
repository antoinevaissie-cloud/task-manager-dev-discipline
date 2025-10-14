import { forwardRef, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

type TaskSidebarProps = {
  groups: Array<{ key: string; label: string; count: number }>;
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string) => void;
  onClearSelection: () => void;
  highlightDateKey?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
};

function TaskSidebar({
  groups,
  selectedDateKey,
  onSelectDate,
  onClearSelection,
  highlightDateKey,
  isOpen = true,
  onClose,
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

  const handleDateSelect = (dateKey: string) => {
    onSelectDate(dateKey);
    // Close mobile sidebar when a date is selected
    if (onClose) onClose();
  };

  const handleClearSelection = () => {
    onClearSelection();
    // Close mobile sidebar when "All" is selected
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <span className="text-xs font-semibold uppercase text-slate-500">Dates</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
              aria-label="Close sidebar"
            >
              <FiX className="h-5 w-5" />
            </button>
          )}
        </div>
        <nav className="flex h-full flex-col overflow-y-auto pb-20">
          <SidebarButton
            isActive={selectedDateKey === null}
            label="All"
            count={total}
            onClick={handleClearSelection}
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
                onClick={() => handleDateSelect(group.key)}
                ref={ref}
              />
            );
          })}
        </nav>
      </aside>
    </>
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
        className={`flex items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-slate-100 active:bg-slate-200 min-h-[44px] ${
          isActive ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-700'
        } ${isHighlighted && !isActive ? 'border-l-2 border-blue-200' : ''}`}
      >
        <span className="flex-1">{label}</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
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

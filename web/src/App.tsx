import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UserMenu from '@/components/auth/UserMenu';
import TaskBoard from '@/features/tasks/components/TaskBoard';
import TaskFormDrawer from '@/features/tasks/components/TaskFormDrawer';
import type { Task } from '@/types/task';

function AppContent() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const openCreateForm = () => {
    setFormMode('create');
    setTaskToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setFormMode('edit');
    setTaskToEdit(task);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setTaskToEdit(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Open Tasks</h1>
          <p className="text-xs text-slate-500">
            Stay on top of your day. Tasks roll forward automatically.
          </p>
        </div>
        <UserMenu />
      </header>

      <main className="relative min-h-[calc(100vh-4rem)]">
        <TaskBoard onCreateTask={openCreateForm} onEditTask={openEditForm} />
        <TaskFormDrawer
          open={isFormOpen}
          mode={formMode}
          task={taskToEdit ?? undefined}
          onClose={closeForm}
        />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppContent />
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;

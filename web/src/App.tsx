import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AuthPage from '@/components/auth/AuthPage';
import ResetPasswordPage from '@/components/auth/ResetPasswordPage';
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage';
import UserMenu from '@/components/auth/UserMenu';
import TaskBoard from '@/features/tasks/components/TaskBoard';
import TaskFormDrawer from '@/features/tasks/components/TaskFormDrawer';
import { MultiAgentChat } from '@/components/chat/MultiAgentChat';
import { AgentChatButton } from '@/components/chat/AgentChatButton';
import type { Task } from '@/types/task';

function AppContent() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

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

  const openAIChat = () => {
    setIsAIChatOpen(true);
  };

  const closeAIChat = () => {
    setIsAIChatOpen(false);
  };

  const handleTaskCreated = () => {
    // This will trigger a refresh of the task list
    // The TaskBoard component should handle this via React Query
    window.location.reload();
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

          {/* AI Chat Components - Multi-Agent System */}
          <AgentChatButton onClick={openAIChat} />
          <MultiAgentChat
            isOpen={isAIChatOpen}
            onClose={closeAIChat}
          />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

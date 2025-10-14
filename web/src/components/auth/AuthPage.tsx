import { useState } from 'react';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {mode === 'login' ? (
          <LoginForm onToggleMode={() => setMode('signup')} />
        ) : (
          <SignUpForm onToggleMode={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}


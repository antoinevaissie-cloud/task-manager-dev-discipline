import { useAuth } from '@/contexts/AuthContext';
import { FiLogOut } from 'react-icons/fi';

export default function UserMenu() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userEmail = user?.email || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
          {userInitial}
        </div>
        <span className="hidden md:inline text-sm font-medium text-slate-700">{userEmail}</span>
      </div>
      
      <button
        type="button"
        onClick={handleSignOut}
        className="flex items-center gap-2 rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        <FiLogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}


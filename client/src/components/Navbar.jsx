import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GitBranch, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-brand-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl hover:opacity-90 transition-opacity">
            <GitBranch className="h-6 w-6 text-brand-400" />
            <span>OfficeGit</span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <User className="h-4 w-4" />
                <span>{user.username}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-600/30 text-brand-300 border border-brand-500/30">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

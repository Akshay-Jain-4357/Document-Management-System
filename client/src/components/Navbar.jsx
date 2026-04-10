import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GitBranch, LogOut, User, Search, Globe, Home } from 'lucide-react';
import NotificationsMenu from './NotificationsMenu';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200/80 sticky top-0 z-50 shadow-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px]">
          {/* Logo & Links */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex items-center justify-center w-8 h-8 bg-brand-600 rounded-lg group-hover:bg-brand-700 transition-colors">
                <GitBranch className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                Office<span className="text-brand-600">Git</span>
              </span>
            </Link>

            {user && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link to="/" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link to="/explore" className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/explore' ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
                  <Globe className="h-4 w-4" />
                  Explore
                </Link>
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <NotificationsMenu />

              {/* Divider */}
              <div className="w-px h-7 bg-gray-200"></div>

              {/* User info */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{user.username}</p>
                  <p className="text-[11px] text-gray-500 leading-tight capitalize">{user.role}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

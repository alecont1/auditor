import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/analysis/new', label: 'New Analysis', icon: '📄' },
    { path: '/history', label: 'History', icon: '📋' },
    { path: '/tokens', label: 'Tokens', icon: '🪙' },
    { path: '/settings/profile', label: 'Settings', icon: '⚙️' },
  ];

  const adminNavItems = [
    { path: '/settings/company', label: 'Company Settings', icon: '🏢' },
    { path: '/settings/users', label: 'User Management', icon: '👥' },
    { path: '/settings/billing', label: 'Billing', icon: '💳' },
  ];

  const superAdminNavItems = [
    { path: '/super-admin/companies', label: 'Companies', icon: '🏛️' },
    { path: '/super-admin/metrics', label: 'System Metrics', icon: '📈' },
  ];

  const showAdminItems = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const showSuperAdminItems = user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
              AuditEng
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {user?.name} ({user?.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Sidebar */}
      <aside className="fixed top-16 left-0 w-60 h-[calc(100vh-64px)] bg-white border-r border-slate-200 overflow-y-auto">
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {showAdminItems && (
            <>
              <div className="my-4 border-t border-slate-200" />
              <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                Admin
              </p>
              <ul className="space-y-1">
                {adminNavItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showSuperAdminItems && (
            <>
              <div className="my-4 border-t border-slate-200" />
              <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                Super Admin
              </p>
              <ul className="space-y-1">
                {superAdminNavItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pt-16 pl-60">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

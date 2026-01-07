import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Breadcrumbs } from './Breadcrumbs';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logout, tokenBalance } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
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
            {/* Mobile Menu Button - min 44px touch target */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 min-h-11 min-w-11 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <Link to="/dashboard" className="text-xl font-bold text-indigo-600 min-h-11 py-2 flex items-center">
              AuditEng
            </Link>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {tokenBalance !== null && (
              <Link
                to="/tokens"
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2.5 min-h-11 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <span>🪙</span>
                <span className="font-medium text-sm md:text-base">{tokenBalance.toLocaleString()}</span>
                <span className="hidden md:inline text-xs text-indigo-500">tokens</span>
              </Link>
            )}
            <span className="hidden md:inline text-sm text-slate-600">
              {user?.name} ({user?.role})
            </span>
            <button
              onClick={handleLogout}
              className="px-3 md:px-4 py-2.5 min-h-11 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-16 left-0 w-64 h-[calc(100vh-64px)] bg-white border-r border-slate-200 overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-4 py-3 min-h-11 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
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
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-4 py-3 min-h-11 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
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
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-4 py-3 min-h-11 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
      </aside>

      {/* Fixed Sidebar - Hidden on mobile, icon-only on tablet, full on desktop */}
      <aside className="hidden md:block fixed top-16 left-0 w-16 lg:w-60 h-[calc(100vh-64px)] bg-white border-r border-slate-200 overflow-y-auto transition-all">
        <nav className="p-2 lg:p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  title={item.label}
                  className={`flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-2.5 min-h-11 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {showAdminItems && (
            <>
              <div className="my-4 border-t border-slate-200" />
              <p className="hidden lg:block px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                Admin
              </p>
              <ul className="space-y-1">
                {adminNavItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={item.label}
                      className={`flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-2.5 min-h-11 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="hidden lg:inline">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showSuperAdminItems && (
            <>
              <div className="my-4 border-t border-slate-200" />
              <p className="hidden lg:block px-4 py-2 text-xs font-semibold text-slate-400 uppercase">
                Super Admin
              </p>
              <ul className="space-y-1">
                {superAdminNavItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      title={item.label}
                      className={`flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-2.5 min-h-11 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-50 text-indigo-600 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="hidden lg:inline">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content - No sidebar offset on mobile, adjusts on tablet/desktop */}
      <main className="pt-16 md:pl-16 lg:pl-60 transition-all">
        <div className="max-w-7xl mx-auto p-8">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
}

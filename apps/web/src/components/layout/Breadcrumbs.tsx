import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

// Map of paths to their labels
const pathLabels: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/analysis': 'Analysis',
  '/analysis/new': 'New Analysis',
  '/history': 'History',
  '/tokens': 'Tokens',
  '/settings': 'Settings',
  '/settings/profile': 'Profile',
  '/settings/company': 'Company',
  '/settings/users': 'Users',
  '/settings/billing': 'Billing',
  '/super-admin': 'Super Admin',
  '/super-admin/companies': 'Companies',
  '/super-admin/metrics': 'Metrics',
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' },
  ];

  let currentPath = '';
  for (const segment of paths) {
    currentPath += '/' + segment;

    // Skip if this is a dynamic segment (like analysis ID)
    if (segment.match(/^[0-9a-f-]{36}$/i)) {
      // This is a UUID, add it with a shortened label
      breadcrumbs.push({
        label: `Analysis #${segment.substring(0, 8)}...`,
        path: currentPath,
      });
    } else if (pathLabels[currentPath]) {
      // Skip dashboard in breadcrumbs since Home represents it
      if (currentPath !== '/dashboard') {
        breadcrumbs.push({
          label: pathLabels[currentPath],
          path: currentPath,
        });
      }
    }
  }

  return breadcrumbs;
}

export function Breadcrumbs() {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  // Don't show breadcrumbs on dashboard (just home)
  if (breadcrumbs.length <= 1 && location.pathname === '/dashboard') {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.path} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-slate-400 mx-2" />
              )}
              {isLast ? (
                <span className="text-slate-600 font-medium">
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <Home className="h-4 w-4" />
                      {crumb.label}
                    </span>
                  ) : (
                    crumb.label
                  )}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {index === 0 ? (
                    <span className="flex items-center gap-1">
                      <Home className="h-4 w-4" />
                      {crumb.label}
                    </span>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

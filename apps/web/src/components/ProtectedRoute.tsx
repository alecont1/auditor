import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'SUPER_ADMIN' | 'ADMIN' | 'ANALYST'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login with intended destination
  if (!isAuthenticated) {
    // Store the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User doesn't have the required role - redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

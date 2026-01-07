import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewAnalysisPage } from './pages/NewAnalysisPage';
import { AnalysisDetailPage } from './pages/AnalysisDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { TokensPage } from './pages/TokensPage';
import { ProfilePage } from './pages/settings/ProfilePage';
import { CompanyPage } from './pages/settings/CompanyPage';
import { UsersPage } from './pages/settings/UsersPage';
import { BillingPage } from './pages/settings/BillingPage';
import { SuperAdminCompaniesPage } from './pages/super-admin/CompaniesPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';

// Wrapper component for protected routes with layout
function ProtectedWithLayout({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: Array<'SUPER_ADMIN' | 'ADMIN' | 'ANALYST'> }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitationPage />} />

          {/* Protected routes - require authentication */}
          <Route path="/dashboard" element={
            <ProtectedWithLayout>
              <DashboardPage />
            </ProtectedWithLayout>
          } />
          <Route path="/analysis/new" element={
            <ProtectedWithLayout>
              <NewAnalysisPage />
            </ProtectedWithLayout>
          } />
          <Route path="/analysis/:id" element={
            <ProtectedWithLayout>
              <AnalysisDetailPage />
            </ProtectedWithLayout>
          } />
          <Route path="/history" element={
            <ProtectedWithLayout>
              <HistoryPage />
            </ProtectedWithLayout>
          } />
          <Route path="/tokens" element={
            <ProtectedWithLayout>
              <TokensPage />
            </ProtectedWithLayout>
          } />

          {/* Settings routes - require authentication */}
          <Route path="/settings/profile" element={
            <ProtectedWithLayout>
              <ProfilePage />
            </ProtectedWithLayout>
          } />
          <Route path="/settings/company" element={
            <ProtectedWithLayout allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <CompanyPage />
            </ProtectedWithLayout>
          } />
          <Route path="/settings/users" element={
            <ProtectedWithLayout allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <UsersPage />
            </ProtectedWithLayout>
          } />
          <Route path="/settings/billing" element={
            <ProtectedWithLayout allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <BillingPage />
            </ProtectedWithLayout>
          } />

          {/* Super Admin routes - require SUPER_ADMIN role */}
          <Route path="/super-admin/companies" element={
            <ProtectedWithLayout allowedRoles={['SUPER_ADMIN']}>
              <SuperAdminCompaniesPage />
            </ProtectedWithLayout>
          } />
          <Route path="/super-admin/metrics" element={
            <ProtectedWithLayout allowedRoles={['SUPER_ADMIN']}>
              <div className="p-4">
                <h1 className="text-2xl font-bold text-slate-900 mb-4">System Metrics</h1>
                <p className="text-slate-600">System metrics dashboard coming soon...</p>
              </div>
            </ProtectedWithLayout>
          } />
          <Route path="/super-admin" element={<Navigate to="/super-admin/companies" replace />} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<div className="flex items-center justify-center h-screen"><h1 className="text-2xl">404 - Page Not Found</h1></div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invitation/:token" element={<div>Accept Invitation Page</div>} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analysis/new" element={<NewAnalysisPage />} />
          <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/tokens" element={<TokensPage />} />

          {/* Settings routes */}
          <Route path="/settings/profile" element={<ProfilePage />} />
          <Route path="/settings/company" element={<CompanyPage />} />
          <Route path="/settings/users" element={<UsersPage />} />
          <Route path="/settings/billing" element={<BillingPage />} />

          {/* Super Admin routes */}
          <Route path="/super-admin/*" element={<div>Super Admin Area</div>} />

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

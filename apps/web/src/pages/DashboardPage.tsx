import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function DashboardPage() {
  const { user } = useAuth();
  const tokenBalance = (user as { company?: { tokenBalance?: number } })?.company?.tokenBalance ?? 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Token Balance:</span>
          <span className="font-semibold text-indigo-600">{tokenBalance.toLocaleString()} tokens</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Analyses This Month</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Approval Rate</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-2">--</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Avg Processing Time</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">--</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Token Balance</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{tokenBalance.toLocaleString()}</p>
        </div>
      </div>

      {/* New Analysis CTA */}
      <Link
        to="/analysis/new"
        className="inline-flex items-center justify-center w-full md:w-auto px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 transition-colors mb-8"
      >
        + New Analysis
      </Link>

      {/* Recent Analyses */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Analyses</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-center py-8">
            No analyses yet. Start by uploading a PDF report.
          </p>
        </div>
      </div>
    </div>
  );
}

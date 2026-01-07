import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API_BASE } from '../lib/auth';
import { formatDate } from '../lib/utils';

interface DashboardStats {
  analysesThisMonth: number;
  approvalRate: number | null;
  avgProcessingTimeSeconds: number | null;
  tokenBalance: number;
}

interface RecentAnalysis {
  id: string;
  filename: string;
  testType: string;
  status: string;
  verdict: string | null;
  score: number | null;
  createdAt: string;
}

export function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsResponse, recentResponse] = await Promise.all([
        fetch(`${API_BASE}/api/analysis/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/analysis/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsResponse.ok || !recentResponse.ok) {
        throw new Error('Failed to load');
      }

      const statsData = await statsResponse.json();
      setStats(statsData.stats);

      const recentData = await recentResponse.json();
      setRecentAnalyses(recentData.analyses);
    } catch (err) {
      setError('Unable to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const getVerdictBadge = (verdict: string | null, status: string) => {
    if (!verdict || status !== 'COMPLETED') {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
          {status}
        </span>
      );
    }
    switch (verdict) {
      case 'APPROVED':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">
            Approved
          </span>
        );
      case 'APPROVED_WITH_COMMENTS':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">
            Approved w/ Comments
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
            {verdict}
          </span>
        );
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-medium text-red-800 mb-2">Connection Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2.5 min-h-11 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Low token threshold for warning
  const LOW_TOKEN_THRESHOLD = 10000;
  const isLowTokenBalance = stats && stats.tokenBalance < LOW_TOKEN_THRESHOLD;

  return (
    <div>
      {/* Low Token Balance Warning */}
      {!loading && isLowTokenBalance && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-amber-800">Low Token Balance</p>
              <p className="text-sm text-amber-700">
                Your token balance is low ({stats.tokenBalance.toLocaleString()} tokens remaining).
                Purchase more tokens to continue analyzing reports.
              </p>
            </div>
            <Link
              to="/tokens"
              className="px-4 py-2.5 min-h-11 flex items-center bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium whitespace-nowrap"
            >
              Purchase Tokens
            </Link>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">Token Balance:</span>
          <span className={`font-semibold ${isLowTokenBalance ? 'text-amber-600' : 'text-indigo-600'}`}>
            {loading ? '--' : (stats?.tokenBalance ?? 0).toLocaleString()} tokens
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Analyses This Month</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {loading ? '--' : stats?.analysesThisMonth ?? 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Approval Rate</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {loading ? '--' : (stats && stats.approvalRate !== null) ? `${stats.approvalRate}%` : '--'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Avg Processing Time</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">
            {loading ? '--' : (stats && stats.avgProcessingTimeSeconds !== null) ? `${stats.avgProcessingTimeSeconds}s` : '--'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-slate-600">Token Balance</h3>
          <p className="text-3xl font-bold text-indigo-600 mt-2">
            {loading ? '--' : (stats?.tokenBalance ?? 0).toLocaleString()}
          </p>
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
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Recent Analyses</h2>
          <Link to="/history" className="text-sm text-indigo-600 hover:text-indigo-800 min-h-11 py-2.5 px-3 flex items-center">
            View All
          </Link>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-slate-600 text-center py-8">Loading...</p>
          ) : recentAnalyses.length === 0 ? (
            <p className="text-slate-600 text-center py-8">
              No analyses yet. Start by uploading a PDF report.
            </p>
          ) : (
            <div className="space-y-4">
              {recentAnalyses.map((analysis) => (
                <Link
                  key={analysis.id}
                  to={`/analysis/${analysis.id}`}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{analysis.filename}</p>
                    <p className="text-sm text-slate-600">
                      {analysis.testType} • {formatDate(analysis.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {analysis.score !== null && (
                      <span className="text-sm font-medium text-slate-600">{analysis.score}%</span>
                    )}
                    {getVerdictBadge(analysis.verdict, analysis.status)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

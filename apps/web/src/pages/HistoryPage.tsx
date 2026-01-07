import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const ITEMS_PER_PAGE = 20;

interface Analysis {
  id: string;
  testType: string;
  filename: string;
  status: string;
  verdict: string | null;
  score: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function HistoryPage() {
  const { token } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [testTypeFilter, setTestTypeFilter] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Get current page from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const response = await fetch('/api/analysis', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch analyses');
        }

        const data = await response.json();
        setAnalyses(data.analyses);
      } catch (err) {
        setError('Failed to load analyses');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [token]);

  const clearFilters = () => {
    setSearchTerm('');
    setTestTypeFilter('');
    setVerdictFilter('');
  };

  const filteredAnalyses = analyses.filter((analysis) => {
    // Search filter
    if (searchTerm && !analysis.filename.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Test type filter
    if (testTypeFilter && analysis.testType !== testTypeFilter) {
      return false;
    }
    // Verdict filter
    if (verdictFilter && analysis.verdict !== verdictFilter) {
      return false;
    }
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredAnalyses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAnalyses = filteredAnalyses.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    setSearchParams(params);
  };

  const getVerdictBadge = (verdict: string | null, status: string) => {
    if (!verdict) {
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
            Approved with Comments
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Analysis History</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">All Test Types</option>
            <option value="GROUNDING">Grounding</option>
            <option value="MEGGER">Megger</option>
            <option value="THERMOGRAPHY">Thermography</option>
          </select>
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value="">All Verdicts</option>
            <option value="APPROVED">Approved</option>
            <option value="APPROVED_WITH_COMMENTS">Approved with Comments</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg flex-1 min-w-[200px]"
          />
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-slate-600 hover:text-slate-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Test Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Verdict</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedAnalyses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-600">
                  {analyses.length === 0
                    ? 'No analyses found. Start by uploading a PDF report.'
                    : 'No analyses match your filters.'}
                </td>
              </tr>
            ) : (
              paginatedAnalyses.map((analysis) => (
                <tr key={analysis.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/analysis/${analysis.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {analysis.filename}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{analysis.testType}</td>
                  <td className="px-6 py-4">{getVerdictBadge(analysis.verdict, analysis.status)}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {analysis.score !== null ? `${analysis.score}%` : '--'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(analysis.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/analysis/${analysis.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAnalyses.length)} of {filteredAnalyses.length} analyses
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 border rounded-lg text-sm ${
                  page === currentPage
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Stats for single page */}
      {totalPages <= 1 && filteredAnalyses.length > 0 && (
        <div className="mt-4 text-sm text-slate-500">
          Showing {filteredAnalyses.length} of {analyses.length} analyses
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/utils';

const ITEMS_PER_PAGE = 20;

interface Analysis {
  id: string;
  testType: string;
  filename: string;
  status: string;
  verdict: string | null;
  score: number | null;
  overallConfidence: number | null;
  requiresReview: boolean;
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from URL query parameters
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [testTypeFilter, setTestTypeFilter] = useState(() => searchParams.get('testType') || '');
  const [verdictFilter, setVerdictFilter] = useState(() => searchParams.get('verdict') || '');
  const [startDate, setStartDate] = useState(() => searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(() => searchParams.get('endDate') || '');
  const [sortBy, setSortBy] = useState<'date' | 'score'>(() => {
    const sort = searchParams.get('sortBy');
    return sort === 'score' ? 'score' : 'date';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    const order = searchParams.get('sortOrder');
    return order === 'asc' ? 'asc' : 'desc';
  });

  // Selection state for bulk export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Get current page from URL, default to 1, with validation for malformed values
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  // Ensure page is a valid positive number, otherwise default to 1
  const currentPage = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const fetchAnalyses = async () => {
    setLoading(true);
    setError(null);
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
      // User-friendly error message without technical details
      setError('Unable to load analyses. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [token]);

  // Sync filter changes to URL query parameters
  // When filters change, we reset to page 1 by not including the page parameter
  useEffect(() => {
    const params = new URLSearchParams();

    // Add filters to URL if they have values
    if (searchTerm) params.set('search', searchTerm);
    if (testTypeFilter) params.set('testType', testTypeFilter);
    if (verdictFilter) params.set('verdict', verdictFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (sortBy !== 'date') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);

    // NOTE: We intentionally do NOT preserve the page parameter when filters change
    // This resets pagination to page 1 when any filter is modified

    // Update URL without adding to history (replace)
    setSearchParams(params, { replace: true });
  }, [searchTerm, testTypeFilter, verdictFilter, startDate, endDate, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setTestTypeFilter('');
    setVerdictFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('date');
    setSortOrder('desc');
  };

  // Quick date filter helpers
  const applyQuickDateFilter = (filter: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (filter) {
      case 'today': {
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      }
      case 'this-week': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        setStartDate(startOfWeek.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      }
      case 'this-month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(startOfMonth.toISOString().split('T')[0]);
        setEndDate(todayStr);
        break;
      }
      case 'last-month': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(startOfLastMonth.toISOString().split('T')[0]);
        setEndDate(endOfLastMonth.toISOString().split('T')[0]);
        break;
      }
      case 'all': {
        setStartDate('');
        setEndDate('');
        break;
      }
    }
  };

  const toggleSort = (field: 'date' | 'score') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: 'date' | 'score') => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'desc' ? (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  const filteredAnalyses = analyses
    .filter((analysis) => {
      // Search filter - trim whitespace to handle spaces-only searches
      const trimmedSearch = searchTerm.trim();
      if (trimmedSearch && !analysis.filename.toLowerCase().includes(trimmedSearch.toLowerCase())) {
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
      // Date range filter - compare using local date strings to avoid timezone issues
      // The input date format is YYYY-MM-DD, so we extract just the date portion from the analysis timestamp
      const analysisLocalDate = new Date(analysis.createdAt).toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format
      if (startDate && analysisLocalDate < startDate) {
        return false;
      }
      if (endDate && analysisLocalDate > endDate) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'score') {
        // Handle null scores - put them at the end
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        comparison = scoreA - scoreB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAnalyses.length / ITEMS_PER_PAGE));
  // Clamp currentPage to valid range (1 to totalPages)
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
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

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const allPageIds = paginatedAnalyses.map((a) => a.id);
    const allSelected = allPageIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allPageIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all on current page
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allPageIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkExport = async (format: 'json' | 'csv') => {
    if (selectedIds.size === 0) return;

    setExporting(true);
    setShowExportDropdown(false);

    try {
      const response = await fetch('/api/analysis/bulk-export', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `analyses_export.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clear selection after successful export
      clearSelection();
    } catch (err) {
      alert('Failed to export analyses');
    } finally {
      setExporting(false);
    }
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
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
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

  // Check if all items on current page are selected
  const allPageSelected = paginatedAnalyses.length > 0 && paginatedAnalyses.every((a) => selectedIds.has(a.id));
  const somePageSelected = paginatedAnalyses.some((a) => selectedIds.has(a.id)) && !allPageSelected;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading analyses...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-medium text-red-800 mb-2">Connection Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchAnalyses}
          className="px-4 py-2.5 min-h-11 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Analysis History</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <select
            value={testTypeFilter}
            onChange={(e) => setTestTypeFilter(e.target.value)}
            className="px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg"
          >
            <option value="">All Test Types</option>
            <option value="GROUNDING">Grounding</option>
            <option value="MEGGER">Megger</option>
            <option value="THERMOGRAPHY">Thermography</option>
          </select>
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            className="px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg"
          >
            <option value="">All Verdicts</option>
            <option value="APPROVED">Approved</option>
            <option value="APPROVED_WITH_COMMENTS">Approved with Comments</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || new Date().toISOString().split('T')[0]}
                className="px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">Quick</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  applyQuickDateFilter(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg"
            >
              <option value="">Select...</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg flex-1 min-w-[200px]"
          />
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 min-h-11 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-indigo-700 font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? 'analysis' : 'analyses'} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="px-4 py-2.5 min-h-11 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={exporting}
                className="px-4 py-2.5 min-h-11 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {exporting ? 'Exporting...' : 'Bulk Export'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                  <button
                    onClick={() => handleBulkExport('json')}
                    className="w-full px-4 py-2.5 min-h-11 text-left hover:bg-slate-50 text-sm"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleBulkExport('csv')}
                    className="w-full px-4 py-2.5 min-h-11 text-left hover:bg-slate-50 text-sm"
                  >
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Test Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Verdict</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                <button
                  onClick={() => toggleSort('score')}
                  className="flex items-center gap-1 hover:text-slate-700"
                >
                  Score
                  {getSortIcon('score')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                <button
                  onClick={() => toggleSort('date')}
                  className="flex items-center gap-1 hover:text-slate-700"
                >
                  Date
                  {getSortIcon('date')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedAnalyses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  {analyses.length === 0 ? (
                    <div className="text-slate-600">
                      No analyses found. Start by uploading a PDF report.
                    </div>
                  ) : (
                    <div className="text-slate-600">
                      <p className="mb-2">
                        No results found
                        {searchTerm.trim() && (
                          <span> for "<span className="font-medium text-slate-900">{searchTerm.trim()}</span>"</span>
                        )}
                        {testTypeFilter && (
                          <span> with test type <span className="font-medium text-slate-900">{testTypeFilter}</span></span>
                        )}
                        {verdictFilter && (
                          <span> with verdict <span className="font-medium text-slate-900">{verdictFilter}</span></span>
                        )}
                      </p>
                      <button
                        onClick={clearFilters}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedAnalyses.map((analysis) => (
                <tr key={analysis.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(analysis.id)}
                      onChange={() => toggleSelect(analysis.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 max-w-[200px]">
                    <Link
                      to={`/analysis/${analysis.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium block truncate"
                      title={analysis.filename}
                    >
                      {analysis.filename}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{analysis.testType}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {getVerdictBadge(analysis.verdict, analysis.status)}
                      {analysis.requiresReview && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded inline-block w-fit">
                          Requires Review
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {analysis.score !== null ? `${analysis.score}%` : '--'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(analysis.createdAt)}
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
              onClick={() => goToPage(validPage - 1)}
              disabled={validPage === 1}
              className="px-4 py-2 min-h-11 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-4 py-2 min-h-11 min-w-11 border rounded-lg text-sm ${
                  page === validPage
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-300 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(validPage + 1)}
              disabled={validPage === totalPages}
              className="px-4 py-2 min-h-11 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

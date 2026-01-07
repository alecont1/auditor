import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

interface Analysis {
  id: string;
  testType: string;
  filename: string;
  status: string;
  verdict: string | null;
  score: number | null;
  overallConfidence: number | null;
  tokensConsumed: number;
  processingTimeMs: number | null;
  extractionData: string | null;
  nonConformities: string | null;
  standardUsed: string;
  createdAt: string;
  completedAt: string | null;
  pdfSizeBytes?: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, refreshTokenBalance } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/analysis/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 404) {
          setError('Analysis not found');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch analysis');
        }

        const data = await response.json();
        setAnalysis(data.analysis);

        // Calculate estimated tokens for reanalysis
        if (data.analysis.pdfSizeBytes) {
          const estimated = Math.max(1000, Math.min(10000, Math.round(data.analysis.pdfSizeBytes / 100)));
          setEstimatedTokens(estimated);
        } else {
          // Fallback estimate based on previous consumption
          setEstimatedTokens(data.analysis.tokensConsumed || 2000);
        }

        // If still processing, poll for updates
        if (data.analysis.status === 'PENDING' || data.analysis.status === 'PROCESSING') {
          if (!pollInterval) {
            pollInterval = setInterval(fetchAnalysis, 2000);
          }
        } else if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
          // Refresh token balance when processing completes
          refreshTokenBalance();
        }
      } catch (err) {
        // User-friendly error for network failures
        setError('Unable to load analysis. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();

    // Expose retry function
    (window as any).__retryAnalysisFetch = fetchAnalysis;

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [id, token]);

  const handleDelete = async () => {
    if (!analysis) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/analysis/${analysis.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete analysis');
      }

      // Redirect to history page after successful deletion
      navigate('/history');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete analysis');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleReanalyze = async () => {
    if (!analysis) return;

    setReanalyzing(true);
    try {
      const response = await fetch(`/api/analysis/${analysis.id}/reanalyze`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start re-analysis');
      }

      // Update local analysis state to show processing
      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              status: 'PENDING',
              verdict: null,
              score: null,
              overallConfidence: null,
              tokensConsumed: 0,
              processingTimeMs: null,
              completedAt: null,
              extractionData: null,
              nonConformities: null,
            }
          : null
      );

      setShowReanalyzeConfirm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start re-analysis');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleCancel = async () => {
    if (!analysis) return;

    try {
      const response = await fetch(`/api/analysis/${analysis.id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel analysis');
      }

      // Update local analysis state to show cancelled
      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              status: 'CANCELLED',
              tokensConsumed: 0,
            }
          : null
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel analysis');
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
    // Check if it's a "not found" error or a network error
    const isNotFound = error === 'Analysis not found';

    if (isNotFound) {
      return (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Analysis Not Found</h1>
          <p className="text-slate-600 mb-6">
            The analysis you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              View History
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    // Network/connection error
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-lg font-medium text-red-800 mb-2">Connection Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            (window as any).__retryAnalysisFetch?.();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const getVerdictColor = (verdict: string | null, status?: string) => {
    // Check status for cancelled
    if (status === 'CANCELLED') {
      return 'bg-orange-100 text-orange-800';
    }
    switch (verdict) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'APPROVED_WITH_COMMENTS':
        return 'bg-amber-100 text-amber-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const isProcessing = analysis.status === 'PENDING' || analysis.status === 'PROCESSING';

  return (
    <div>
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Analysis</h2>
            <p className="text-slate-600 mb-4">
              Are you sure you want to delete "{analysis.filename}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-analyze Confirmation Dialog */}
      {showReanalyzeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Re-analyze Document</h2>
            <p className="text-slate-600 mb-4">
              This will re-process "{analysis.filename}" with the latest AI model. Previous results will be replaced.
            </p>
            <div className="bg-indigo-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-indigo-700">
                <span className="font-medium">Estimated tokens:</span> ~{estimatedTokens?.toLocaleString() || '--'}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReanalyzeConfirm(false)}
                disabled={reanalyzing}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {reanalyzing ? 'Starting...' : 'Confirm Re-analyze'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analysis Details</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowReanalyzeConfirm(true)}
            disabled={isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Re-analyze
          </button>
          <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
            Export
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <p className="text-lg font-medium text-indigo-900">Processing Analysis...</p>
                <p className="text-sm text-indigo-700">Your PDF is being analyzed. This typically takes a few seconds.</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Verdict Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Analysis ID: {analysis.id}</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-1">{analysis.filename}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {analysis.testType} • {analysis.standardUsed} Standard
            </p>
          </div>
          <div className={`px-6 py-3 rounded-lg text-lg font-semibold ${getVerdictColor(analysis.verdict, analysis.status)}`}>
            {analysis.verdict || analysis.status}
          </div>
        </div>

        {/* Score and Confidence */}
        {analysis.score !== null && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">Score</p>
              <p className="text-2xl font-bold text-slate-900">{analysis.score}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Confidence</p>
              <p className="text-2xl font-bold text-slate-900">
                {analysis.overallConfidence ? `${(analysis.overallConfidence * 100).toFixed(0)}%` : '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Tokens Used</p>
              <p className="text-2xl font-bold text-slate-900">{analysis.tokensConsumed.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Extraction Data */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Extracted Data</h3>
        {analysis.extractionData ? (
          <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(JSON.parse(analysis.extractionData), null, 2)}
          </pre>
        ) : (
          <p className="text-slate-600">No extraction data available.</p>
        )}
      </div>

      {/* Non-Conformities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Non-Conformities</h3>
        {analysis.nonConformities ? (
          <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(JSON.parse(analysis.nonConformities), null, 2)}
          </pre>
        ) : (
          <p className="text-slate-600">No non-conformities found.</p>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Created By</p>
            <p className="text-slate-900">{analysis.user.name}</p>
          </div>
          <div>
            <p className="text-slate-500">Created At</p>
            <p className="text-slate-900">{new Date(analysis.createdAt).toLocaleString()}</p>
          </div>
          {analysis.completedAt && (
            <div>
              <p className="text-slate-500">Completed At</p>
              <p className="text-slate-900">{new Date(analysis.completedAt).toLocaleString()}</p>
            </div>
          )}
          {analysis.processingTimeMs && (
            <div>
              <p className="text-slate-500">Processing Time</p>
              <p className="text-slate-900">{(analysis.processingTimeMs / 1000).toFixed(1)}s</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      } catch (err) {
        setError('Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Analysis Not Found</h1>
        <p className="text-slate-600 mb-6">
          The analysis you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const getVerdictColor = (verdict: string | null) => {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analysis Details</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Re-analyze
          </button>
          <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">
            Export
          </button>
        </div>
      </div>

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
          <div className={`px-6 py-3 rounded-lg text-lg font-semibold ${getVerdictColor(analysis.verdict)}`}>
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

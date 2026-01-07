import { useParams } from 'react-router-dom';

export function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <p className="text-sm text-slate-600">Analysis ID: {id}</p>
              <h2 className="text-xl font-semibold text-slate-900 mt-1">Report.pdf</h2>
            </div>
            <div className="px-6 py-3 bg-emerald-100 text-emerald-800 rounded-lg text-lg font-semibold">
              APPROVED
            </div>
          </div>
        </div>

        {/* Extraction Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Extracted Data</h3>
          <p className="text-slate-600">Extraction data will be displayed here...</p>
        </div>

        {/* Non-Conformities */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Non-Conformities</h3>
          <p className="text-slate-600">No non-conformities found.</p>
        </div>
      </div>
    </div>
  );
}

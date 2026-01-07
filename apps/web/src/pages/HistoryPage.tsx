export function HistoryPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Analysis History</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <select className="px-3 py-2 border border-slate-300 rounded-lg">
              <option value="">All Test Types</option>
              <option value="GROUNDING">Grounding</option>
              <option value="MEGGER">Megger</option>
              <option value="THERMOGRAPHY">Thermography</option>
            </select>
            <select className="px-3 py-2 border border-slate-300 rounded-lg">
              <option value="">All Verdicts</option>
              <option value="APPROVED">Approved</option>
              <option value="APPROVED_WITH_COMMENTS">Approved with Comments</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input
              type="text"
              placeholder="Search..."
              className="px-3 py-2 border border-slate-300 rounded-lg flex-1 min-w-[200px]"
            />
            <button className="px-4 py-2 text-slate-600 hover:text-slate-900">
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
            <tbody>
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-600">
                  No analyses found. Start by uploading a PDF report.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BillingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Billing & Purchase History</h1>

        {/* Current Balance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-slate-900">Current Token Balance</h2>
              <p className="text-4xl font-bold text-indigo-600 mt-2">0 tokens</p>
            </div>
            <a
              href="/tokens"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Purchase More
            </a>
          </div>
        </div>

        {/* Purchase History */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Purchase History</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Package</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-600">
                  No purchases yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

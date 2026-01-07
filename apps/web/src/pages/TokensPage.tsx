export function TokensPage() {
  const packages = [
    { id: 'starter', name: 'Starter', tokens: 50000, price: 25 },
    { id: 'basic', name: 'Basic', tokens: 150000, price: 65 },
    { id: 'professional', name: 'Professional', tokens: 400000, price: 150 },
    { id: 'business', name: 'Business', tokens: 1000000, price: 350 },
    { id: 'enterprise', name: 'Enterprise', tokens: 3000000, price: 900 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Tokens</h1>

        {/* Current Balance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-slate-900">Current Balance</h2>
          <p className="text-4xl font-bold text-indigo-600 mt-2">0 tokens</p>
        </div>

        {/* Token Packages */}
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Purchase Tokens</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900">{pkg.name}</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                ${pkg.price}
              </p>
              <p className="text-slate-600 mt-1">
                {pkg.tokens.toLocaleString()} tokens
              </p>
              <button className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Purchase
              </button>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Transaction History</h2>
          </div>
          <div className="p-6">
            <p className="text-slate-600 text-center py-8">
              No transactions yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

interface Package {
  id: string;
  name: string;
  tokens: number;
  price: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  analysisId: string | null;
  createdAt: string;
}

export function TokensPage() {
  const { token, user, refreshTokenBalance } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceRes, packagesRes, transactionsRes] = await Promise.all([
        fetch('/api/tokens/balance', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/tokens/packages', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/tokens/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!balanceRes.ok || !packagesRes.ok || !transactionsRes.ok) {
        throw new Error('Failed to load');
      }

      const balanceData = await balanceRes.json();
      setBalance(balanceData.balance);

      const packagesData = await packagesRes.json();
      setPackages(packagesData.packages);

      const transactionsData = await transactionsRes.json();
      setTransactions(transactionsData.transactions);
    } catch (err) {
      setError('Unable to load tokens data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handlePurchase = async (packageId: string) => {
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      alert('Only administrators can purchase tokens');
      return;
    }

    setPurchasing(packageId);
    setPurchaseSuccess(null);

    try {
      const response = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Purchase failed');
      }

      const data = await response.json();
      const pkg = packages.find((p) => p.id === packageId);

      // Update balance
      setBalance(data.transaction.balance);
      // Also update header balance
      refreshTokenBalance();

      // Add transaction to list
      setTransactions((prev) => [
        {
          id: data.transaction.id,
          type: 'PURCHASE',
          amount: pkg?.tokens || 0,
          balance: data.transaction.balance,
          description: `Purchased ${pkg?.name} package`,
          analysisId: null,
          createdAt: data.transaction.createdAt,
        },
        ...prev,
      ]);

      setPurchaseSuccess(`Successfully purchased ${pkg?.name} package!`);
      setTimeout(() => setPurchaseSuccess(null), 3000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Connection Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Tokens</h1>

        {/* Purchase Success Banner */}
        {purchaseSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
            {purchaseSuccess}
          </div>
        )}

        {/* Current Balance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-slate-900">Current Balance</h2>
          <p className="text-4xl font-bold text-indigo-600 mt-2">
            {balance !== null ? balance.toLocaleString() : '--'} tokens
          </p>
        </div>

        {/* Token Packages */}
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Purchase Tokens</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-slate-900">{pkg.name}</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                ${(pkg.price / 100).toFixed(0)}
              </p>
              <p className="text-slate-600 mt-1">
                {pkg.tokens.toLocaleString()} tokens
              </p>
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasing !== null}
                className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchasing === pkg.id ? 'Processing...' : 'Purchase'}
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
            {transactions.length === 0 ? (
              <p className="text-slate-600 text-center py-8">
                No transactions yet.
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{tx.description}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {tx.amount > 0 ? '+' : ''}
                        {tx.amount.toLocaleString()} tokens
                      </p>
                      <p className="text-sm text-slate-500">
                        Balance: {tx.balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

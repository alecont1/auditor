import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { PasswordConfirmModal } from '../../components/PasswordConfirmModal';

interface Company {
  id: string;
  name: string;
  defaultStandard: string;
  tokenBalance: number;
  createdAt: string;
  _count?: {
    users: number;
    analyses: number;
  };
}

export function SuperAdminCompaniesPage() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }

      const data = await response.json();
      setCompanies(data.companies);
    } catch (err) {
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [token]);

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (password: string) => {
    if (!companyToDelete) return;

    const response = await fetch(`/api/companies/${companyToDelete.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to delete company');
    }

    // Success - close modal and refresh list
    setDeleteModalOpen(false);
    setCompanyToDelete(null);
    await fetchCompanies();
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCompanyToDelete(null);
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Company Management</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          + Add Company
        </button>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Standard</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Token Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Users</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Analyses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-600">
                  No companies found.
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{company.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{company.defaultStandard}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{company.tokenBalance.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{company._count?.users || 0}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{company._count?.analyses || 0}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="text-indigo-600 hover:text-indigo-800 text-sm">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(company)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <PasswordConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Company"
        message={`Are you sure you want to delete "${companyToDelete?.name}"? This will permanently delete all company data including users, analyses, and transaction history. This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Delete Company"
      />
    </div>
  );
}

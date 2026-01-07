import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { PasswordConfirmModal } from '../../components/PasswordConfirmModal';
import { formatDate } from '../../lib/utils';

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

interface CreateCompanyForm {
  companyName: string;
  defaultStandard: 'NETA' | 'MICROSOFT';
  tokenBalance: number;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

export function SuperAdminCompaniesPage() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateCompanyForm>({
    companyName: '',
    defaultStandard: 'NETA',
    tokenBalance: 100000,
    adminEmail: '',
    adminName: '',
    adminPassword: '',
  });

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

  const handleCreateClick = () => {
    setCreateForm({
      companyName: '',
      defaultStandard: 'NETA',
      tokenBalance: 100000,
      adminEmail: '',
      adminName: '',
      adminPassword: '',
    });
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    try {
      // Step 1: Create the company
      const createResponse = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createForm.companyName,
          defaultStandard: createForm.defaultStandard,
          tokenBalance: createForm.tokenBalance,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.message || 'Failed to create company');
      }

      const { company } = await createResponse.json();

      // Step 2: Create the first admin for the company
      const adminResponse = await fetch(`/api/companies/${company.id}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: createForm.adminEmail,
          name: createForm.adminName,
          password: createForm.adminPassword,
        }),
      });

      if (!adminResponse.ok) {
        const data = await adminResponse.json();
        throw new Error(data.message || 'Company created but failed to create admin');
      }

      // Success
      setCreateModalOpen(false);
      setCreateSuccess(`Company "${createForm.companyName}" created successfully with admin ${createForm.adminEmail}`);
      setTimeout(() => setCreateSuccess(null), 5000);
      await fetchCompanies();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCancel = () => {
    setCreateModalOpen(false);
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
        <button
          onClick={handleCreateClick}
          className="px-4 py-2.5 min-h-11 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          + Add Company
        </button>
      </div>

      {/* Success Message */}
      {createSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
          {createSuccess}
        </div>
      )}

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
                    {formatDate(company.createdAt)}
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

      {/* Create Company Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Create New Company</h2>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4">
                {createError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Default Standard
                  </label>
                  <select
                    value={createForm.defaultStandard}
                    onChange={(e) => setCreateForm({ ...createForm, defaultStandard: e.target.value as 'NETA' | 'MICROSOFT' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="NETA">NETA ATS-2021</option>
                    <option value="MICROSOFT">Microsoft CxPOR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Initial Token Balance
                  </label>
                  <input
                    type="number"
                    value={createForm.tokenBalance}
                    onChange={(e) => setCreateForm({ ...createForm, tokenBalance: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                    required
                  />
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-medium text-slate-900 mb-3">First Administrator</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Admin Name
                      </label>
                      <input
                        type="text"
                        value={createForm.adminName}
                        onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter admin name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Admin Email
                      </label>
                      <input
                        type="email"
                        value={createForm.adminEmail}
                        onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="admin@company.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Admin Password
                      </label>
                      <input
                        type="password"
                        value={createForm.adminPassword}
                        onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCreateCancel}
                  disabled={creating}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function UsersPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Invite User
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900">Admin User</span>
                </td>
                <td className="px-6 py-4 text-slate-600">admin@example.com</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                    ADMIN
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-slate-600 hover:text-slate-900">Edit</button>
                    <button className="text-red-600 hover:text-red-800">Remove</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

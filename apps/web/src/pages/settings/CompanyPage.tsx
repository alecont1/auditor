export function CompanyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Company Settings</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                  <span className="text-slate-400">Logo</span>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Upload Logo
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Default Validation Standard
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="NETA">NETA ATS-2021</option>
                <option value="MICROSOFT">Microsoft CxPOR</option>
              </select>
              <p className="text-sm text-slate-500 mt-1">
                This standard will be applied to new analyses by default
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

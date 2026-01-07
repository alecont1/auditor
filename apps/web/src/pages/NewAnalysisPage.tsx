import { useNavigate } from 'react-router-dom';

export function NewAnalysisPage() {
  const navigate = useNavigate();

  const handleCancel = () => {
    // Go back to the previous page, or dashboard if no history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">New Analysis</h1>

        <div className="bg-white rounded-lg shadow p-6">
          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
            <div className="text-slate-600">
              <p className="text-lg">Drag and drop your PDF here</p>
              <p className="text-sm mt-2">or click to browse</p>
            </div>
          </div>

          {/* Test Type Selection */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Select Test Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 transition-colors text-left">
                <h4 className="font-medium text-slate-900">Grounding</h4>
                <p className="text-sm text-slate-600 mt-1">Ground resistance testing</p>
              </button>
              <button className="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 transition-colors text-left">
                <h4 className="font-medium text-slate-900">Megger</h4>
                <p className="text-sm text-slate-600 mt-1">Insulation resistance testing</p>
              </button>
              <button className="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 transition-colors text-left">
                <h4 className="font-medium text-slate-900">Thermography</h4>
                <p className="text-sm text-slate-600 mt-1">Thermal imaging analysis</p>
              </button>
            </div>
          </div>

          {/* Token Estimate */}
          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Estimated tokens:</span>
              <span className="font-medium text-slate-900">-- tokens</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <button className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50">
              Start Analysis
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

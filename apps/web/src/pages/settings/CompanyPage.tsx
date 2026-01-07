import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/auth';

export function CompanyPage() {
  const { token, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Company data
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [defaultStandard, setDefaultStandard] = useState('NETA');

  // Original values for dirty checking
  const [originalName, setOriginalName] = useState('');
  const [originalStandard, setOriginalStandard] = useState('NETA');

  // UI state
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Check if form is dirty (has unsaved changes) - for future use
  const _isDirty = companyName !== originalName || defaultStandard !== originalStandard;
  void _isDirty; // Suppress unused warning

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.companyId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/companies/${user.companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          const name = data.company.name || '';
          const standard = data.company.defaultStandard || 'NETA';
          setCompanyName(name);
          setLogoUrl(data.company.logoUrl);
          setDefaultStandard(standard);
          // Store original values for dirty checking
          setOriginalName(name);
          setOriginalStandard(standard);
        }
      } catch (err) {
        console.error('Failed to fetch company:', err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCompany();
    }
  }, [token, user?.companyId]);

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 50));
        }
      };

      reader.onload = async () => {
        setUploadProgress(50);

        try {
          const base64Data = reader.result as string;

          const response = await fetch(`/api/companies/${user?.companyId}/logo`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: base64Data,
              filename: file.name,
            }),
          });

          setUploadProgress(90);

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Failed to upload logo');
          }

          setLogoUrl(data.logoUrl);
          setUploadProgress(100);
          setSuccess('Logo uploaded successfully');
          setTimeout(() => {
            setSuccess(null);
            setUploadProgress(null);
          }, 5000);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to upload logo');
          setUploadProgress(null);
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
        setUploading(false);
        setUploadProgress(null);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload logo');
      setUploading(false);
      setUploadProgress(null);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate company name - reject empty or whitespace-only
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/companies/${user?.companyId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: companyName,
          defaultStandard,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update company');
      }

      // Update original values after successful save
      setOriginalName(companyName);
      setOriginalStandard(defaultStandard);

      setSuccess('Company settings saved successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // Check if user has permission
  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-slate-600">Only administrators can modify company settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Company Settings</h1>

        <div className="bg-white rounded-lg shadow p-6">
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 flex items-center justify-between">
              <span>{success}</span>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="ml-4 text-emerald-600 hover:text-emerald-800"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-4 text-red-500 hover:text-red-700"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // If logo fails to load, show placeholder
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-slate-400 text-sm">Logo</span>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleLogoClick}
                    disabled={uploading}
                    className="px-4 py-2.5 min-h-11 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </button>
                  <p className="text-sm text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>

              {/* Upload Progress */}
              {uploadProgress !== null && (
                <div className="mt-3">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{uploadProgress}% complete</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Default Validation Standard
              </label>
              <select
                value={defaultStandard}
                onChange={(e) => setDefaultStandard(e.target.value)}
                className="w-full px-3 py-2.5 min-h-11 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="NETA">NETA ATS-2021</option>
                <option value="MICROSOFT">Microsoft CxPOR</option>
              </select>
              <p className="text-sm text-slate-500 mt-1">
                This standard will be applied to new analyses by default
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 min-h-11 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

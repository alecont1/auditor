import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type TestType = 'GROUNDING' | 'MEGGER' | 'THERMOGRAPHY';

interface AnalysisResponse {
  id: string;
  filename: string;
  testType: string;
  status: string;
}

interface ErrorInfo {
  message: string;
  isTokenError: boolean;
}

export function NewAnalysisPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<TestType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Estimated tokens based on file size (~8000 tokens/MB)
  const estimatedTokens = selectedFile
    ? Math.max(1000, Math.round((selectedFile.size / (1024 * 1024)) * 8000))
    : null;

  const handleCancel = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type !== 'application/pdf') {
        setError({ message: 'PDF files only. Please upload a PDF document.', isTokenError: false });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError({ message: 'File too large. Maximum file size is 100MB.', isTokenError: false });
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type !== 'application/pdf') {
        setError({ message: 'PDF files only. Please upload a PDF document.', isTokenError: false });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError({ message: 'File too large. Maximum file size is 100MB.', isTokenError: false });
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedTestType) {
      setError({ message: 'Please select a file and test type', isTokenError: false });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress for UX
      const simulateProgress = () => {
        return new Promise<void>((resolve) => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 90) {
              progress = 90;
              clearInterval(interval);
              resolve();
            }
            setUploadProgress(Math.min(progress, 90));
          }, 100);
        });
      };

      // Start progress simulation in parallel with the API call
      const progressPromise = simulateProgress();

      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          testType: selectedTestType,
          pdfSizeBytes: selectedFile.size,
        }),
      });

      // Wait for progress simulation to complete
      await progressPromise;
      setUploadProgress(100);

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.message || 'Failed to create analysis';

        // Check if this is an insufficient tokens error
        const isTokenError =
          response.status === 402 ||
          errorMessage.toLowerCase().includes('token') ||
          errorMessage.toLowerCase().includes('insufficient');

        setError({
          message: isTokenError
            ? "You don't have enough tokens to start this analysis."
            : errorMessage,
          isTokenError,
        });
        setIsSubmitting(false);
        setUploadProgress(null);
        return;
      }

      const data = await response.json();
      const analysis: AnalysisResponse = data.analysis;

      // Redirect to analysis detail page, replacing the form in history
      // This prevents duplicate submissions when using browser back button
      navigate(`/analysis/${analysis.id}`, { replace: true });
    } catch (err) {
      setError({
        message: 'Unable to create analysis. Please check your connection and try again.',
        isTokenError: false,
      });
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const testTypes: { type: TestType; name: string; description: string; icon: React.ReactNode }[] = [
    {
      type: 'GROUNDING',
      name: 'Grounding',
      description: 'Ground resistance testing',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      type: 'MEGGER',
      name: 'Megger',
      description: 'Insulation resistance testing',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      type: 'THERMOGRAPHY',
      name: 'Thermography',
      description: 'Thermal imaging analysis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">New Analysis</h1>

        <div className="bg-white rounded-lg shadow p-6">
          {/* Error message */}
          {error && (
            <div className={`mb-6 p-4 border rounded-lg ${
              error.isTokenError
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p className="font-medium">{error.message}</p>
              {error.isTokenError && (
                <Link
                  to="/tokens"
                  className="inline-flex items-center mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Purchase more tokens →
                </Link>
              )}
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onClick={handleDropzoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-indigo-500 bg-indigo-50'
                : selectedFile
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-300 hover:border-indigo-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="text-emerald-700">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">{selectedFile.name}</p>
                <p className="text-sm mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="mt-4 text-sm text-slate-600 hover:text-slate-900 underline"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="text-slate-600">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg">Drag and drop your PDF here</p>
                <p className="text-sm mt-2">or click to browse</p>
              </div>
            )}
          </div>

          {/* Test Type Selection */}
          <div className="mt-8">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Select Test Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testTypes.map(({ type, name, description, icon }) => (
                <button
                  key={type}
                  onClick={() => setSelectedTestType(type)}
                  className={`p-4 min-h-[88px] border-2 rounded-lg transition-colors text-left ${
                    selectedTestType === type
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  <div className={`mb-2 ${selectedTestType === type ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {icon}
                  </div>
                  <h4 className="font-medium text-slate-900">{name}</h4>
                  <p className="text-sm text-slate-600 mt-1">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Token Estimate */}
          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Estimated tokens:</span>
              <span className="font-medium text-slate-900">
                {estimatedTokens ? `~${estimatedTokens.toLocaleString()} tokens` : '-- tokens'}
              </span>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadProgress !== null && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {uploadProgress < 100 ? 'Uploading file...' : 'Upload complete!'}
                </span>
                <span className="text-sm text-slate-500">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || !selectedTestType || isSubmitting}
              className="flex-1 py-3 min-h-12 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Analysis...
                </span>
              ) : (
                'Start Analysis'
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-6 py-3 min-h-12 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';

export function ProfilePage() {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [newPasswordFieldError, setNewPasswordFieldError] = useState<string | null>(null);
  const [confirmPasswordFieldError, setConfirmPasswordFieldError] = useState<string | null>(null);

  // Profile save state
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setEmailNotifications(data.user.emailNotifications ?? true);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  // Password field validation
  const validateNewPassword = (value: string) => {
    if (!value) {
      setNewPasswordFieldError(null);
      return true;
    }
    if (value.length < 8) {
      setNewPasswordFieldError('Must be at least 8 characters');
      return false;
    }
    if (!/\d/.test(value)) {
      setNewPasswordFieldError('Must contain at least one number');
      return false;
    }
    setNewPasswordFieldError(null);
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmPasswordFieldError(null);
      return;
    }
    if (value !== newPassword) {
      setConfirmPasswordFieldError('Passwords do not match');
    } else {
      setConfirmPasswordFieldError(null);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setNewPasswordFieldError('New password is required');
      return;
    }

    if (newPassword.length < 8) {
      setNewPasswordFieldError('Must be at least 8 characters');
      return;
    }

    if (!/\d/.test(newPassword)) {
      setNewPasswordFieldError('Must contain at least one number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordFieldError('Passwords do not match');
      return;
    }

    setPasswordChanging(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSaving(true);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          emailNotifications,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setProfileSuccess('Profile updated successfully');
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Profile Settings</h1>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleProfileSave} className="space-y-6">
            {profileSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                {profileSuccess}
              </div>
            )}

            {profileError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {profileError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                placeholder="your@email.com"
                disabled
              />
              <p className="text-sm text-slate-500 mt-1">Email cannot be changed</p>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Notifications</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="ml-2 text-slate-700">Email notifications when analysis completes</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Password Change Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Change Password</h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  validateNewPassword(e.target.value);
                }}
                onBlur={(e) => validateNewPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  newPasswordFieldError ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {newPasswordFieldError ? (
                <p className="text-sm text-red-600 mt-1">{newPasswordFieldError}</p>
              ) : (
                <p className="text-sm text-slate-500 mt-1">Must be at least 8 characters and contain a number</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  validateConfirmPassword(e.target.value);
                }}
                onBlur={(e) => validateConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  confirmPasswordFieldError ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {confirmPasswordFieldError && (
                <p className="text-sm text-red-600 mt-1">{confirmPasswordFieldError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordChanging}
              className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordChanging ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

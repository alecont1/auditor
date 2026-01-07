import { useState } from 'react';
import { Modal } from './ui/Modal';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
}

export function InviteUserModal({ isOpen, onClose, onInvite }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ANALYST');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onInvite(email, role);
      setEmail('');
      setRole('ANALYST');
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('ANALYST');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite User">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="invite-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="user@example.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-slate-700 mb-1">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ANALYST">Analyst</option>
              <option value="ADMIN">Admin</option>
            </select>
            <p className="mt-1 text-sm text-slate-500">
              {role === 'ADMIN'
                ? 'Admins can manage users and company settings'
                : 'Analysts can create and view analyses'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 min-h-[44px] text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2.5 min-h-[44px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

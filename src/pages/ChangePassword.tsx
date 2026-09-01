import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, getStoredUser, storeUser } from '@/api';
import { useAuth } from '../auth/AuthContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const forced = Boolean(user?.mustChangePassword);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      const stored = getStoredUser();
      if (stored) {
        storeUser({ ...stored, mustChangePassword: false });
        refreshUser();
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Change password</h1>
        {forced && (
          <p className="muted">
            You signed in with a default password — please set your own before continuing.
          </p>
        )}
      </header>

      <form className="panel-card" onSubmit={onSubmit}>
        <label>
          Current password
          <input
            type="password"
            className="input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          New password (min 8 characters)
          <input
            type="password"
            className="input"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  );
}

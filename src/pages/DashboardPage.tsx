import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {
  AccessLevel,
  DashboardMeta,
  UserOption,
  getUserOptions,
  grantAccess,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { loadDashboard } from '../dashboards/registry';

const ADMIN_LEVELS: AccessLevel[] = ['view', 'share', 'developer', 'admin'];

function SharePanel({ meta, myLevel }: { meta: DashboardMeta; myLevel: AccessLevel }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<UserOption[]>([]);
  const [target, setTarget] = useState('');
  const [level, setLevel] = useState<AccessLevel>('view');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const levels = myLevel === 'admin' ? ADMIN_LEVELS : (['view'] as AccessLevel[]);

  useEffect(() => {
    if (open) getUserOptions().then(setOptions).catch(() => setOptions([]));
  }, [open]);

  const onShare = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await grantAccess(meta.id, target, level);
      setMessage(`Shared with ${target} (${level}).`);
      setTarget('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share failed');
    }
  };

  return (
    <div className="share-panel">
      <button className="btn" onClick={() => setOpen((v) => !v)}>
        {open ? 'Close sharing' : 'Share'}
      </button>
      {open && (
        <form className="form-row" onSubmit={onShare}>
          <select
            className="input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          >
            <option value="" disabled>
              Share with…
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.username}>
                {o.username}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value as AccessLevel)}
          >
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button className="btn btn-primary">Grant</button>
          {message && <span className="muted small-text">{message}</span>}
          {error && <span className="error-box">{error}</span>}
        </form>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { dashboards } = useOutletContext<{ dashboards: DashboardMeta[] }>();

  const meta = dashboards.find((d) => d.id === id);
  const Component = useMemo(() => (meta ? loadDashboard(meta.component) : null), [meta?.component]);

  if (!meta) {
    return (
      <div className="page">
        <div className="error-box">Dashboard not found or you don't have access to it.</div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="page">
        <div className="error-box">
          Component "{meta.component}" is registered but the file
          frontend/src/dashboards/{meta.component}.tsx was not found.
        </div>
      </div>
    );
  }

  const myLevel: AccessLevel = user?.role === 'admin' ? 'admin' : meta.accessLevel || 'view';
  const canShare = myLevel === 'share' || myLevel === 'developer' || myLevel === 'admin';

  return (
    <div className="page">
      <header className="page-header dashboard-header">
        <div>
          <h1>{meta.name}</h1>
          {meta.description && <p className="muted">{meta.description}</p>}
        </div>
        {canShare && <SharePanel meta={meta} myLevel={myLevel} />}
      </header>
      <Suspense fallback={<div className="muted">Loading dashboard…</div>}>
        <Component />
      </Suspense>
    </div>
  );
}

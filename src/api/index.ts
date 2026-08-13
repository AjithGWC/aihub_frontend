// Single unified API file. Every network call in the app is a named function
// exported here — components import a function and call it; nothing outside
// this file should call fetch() directly.
//
// Two backend domains live behind these functions, both hosted by the same
// backend_aihub server: a cookie-session domain (AI-Access-Hub: auth, users,
// api-keys, permissions, models, audit-log) and a Bearer-token domain
// (legacy dashboards/tiles/user-access). Both go through API_BASE_URL.

import { API_BASE_URL, redirectToLogin } from '@/lib/apiBase';

// ---------------------------------------------------------------------------
// Local session storage (Bearer-token flow)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'ads_token';
const USER_KEY = 'ads_user';

export type AccessLevel = 'view' | 'share' | 'developer' | 'admin';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  mustChangePassword?: boolean;
}

export interface DashboardMeta {
  id: string;
  name: string;
  component: string;
  description?: string;
  accessLevel?: AccessLevel;
}

export interface ManagedUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  createdAt: string;
}

export interface UserOption {
  id: number;
  username: string;
}

export interface AccessGrant {
  userId: number;
  username: string;
  level: AccessLevel;
  grantedBy?: string;
}

export interface UserAccessGrant {
  dashboardId: string;
  dashboardName: string;
  level: AccessLevel;
  grantedBy?: string;
}

export interface ScopeOptionValue {
  value: string;
  label: string;
}

export interface ScopeDimension {
  dimension: string;
  label: string;
  values: ScopeOptionValue[];
}

export interface UserScopeResponse {
  userId: number;
  scopes: Record<string, string[]>;
  enforced: boolean;
}

export interface MyProfile {
  id: number;
  username: string;
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  createdAt: string | null;
  dashboardCount: number;
  /** dimension -> allowed values. Empty/absent means "no restriction". */
  scopes: Partial<Record<'site' | 'division' | string, string[]>>;
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
};
export const storeSession = (token: string, user: User) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const storeUser = (user: User) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// ---------------------------------------------------------------------------
// Bearer-token fetch helper (legacy dashboards/tiles/user-access domain)
// ---------------------------------------------------------------------------

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---- Auth ----

export const login = (username: string, password: string) =>
  authFetch<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const changePassword = (currentPassword: string, newPassword: string) =>
  authFetch<{ ok: boolean }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const getMyProfile = () => authFetch<MyProfile>('/api/auth/me');

// ---- Dashboards & sharing ----

export const getDashboards = () => authFetch<DashboardMeta[]>('/api/dashboards');

export const getUserOptions = () => authFetch<UserOption[]>('/api/users/options');

export const getDashboardAccess = (dashboardId: string) =>
  authFetch<AccessGrant[]>(`/api/dashboards/${encodeURIComponent(dashboardId)}/access`);

export const grantAccess = (dashboardId: string, username: string, level: AccessLevel) =>
  authFetch<{ ok: boolean }>(`/api/dashboards/${encodeURIComponent(dashboardId)}/access`, {
    method: 'POST',
    body: JSON.stringify({ username, level }),
  });

export const revokeAccess = (dashboardId: string, userId: number) =>
  authFetch<{ ok: boolean }>(
    `/api/dashboards/${encodeURIComponent(dashboardId)}/access/${userId}`,
    { method: 'DELETE' }
  );

// ---- Admin: user management, single user + data scope ----

export const getUsers = () => authFetch<ManagedUser[]>('/api/users');

export const createUser = (username: string, password: string, role: 'admin' | 'user') =>
  authFetch<{ ok: boolean }>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });

export const updateUser = (id: number, patch: { role?: 'admin' | 'user'; password?: string }) =>
  authFetch<{ ok: boolean }>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteUser = (id: number) =>
  authFetch<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' });

export const getUserAccess = (id: number) => authFetch<UserAccessGrant[]>(`/api/users/${id}/access`);

export const getUserDetail = (id: number) => authFetch<ManagedUser>(`/api/users/${id}`);

export const getScopeOptions = () => authFetch<ScopeDimension[]>('/api/users/scope-options');

export const getUserScope = (id: number) => authFetch<UserScopeResponse>(`/api/users/${id}/scope`);

export const saveUserScope = (id: number, scopes: Record<string, string[]>) =>
  authFetch<{ ok: boolean; enforced?: boolean }>(`/api/users/${id}/scope`, {
    method: 'PUT',
    body: JSON.stringify({ scopes }),
  });

// ---------------------------------------------------------------------------
// Tile streaming (NDJSON) — same Bearer/cookie combo, not a JSON round-trip
// ---------------------------------------------------------------------------

export interface TileMeta {
  id: string;
  title: string;
}

export interface TileResult<T = Record<string, unknown>> {
  id: string;
  title: string;
  rows: T[];
  rowCount: number;
  truncated: boolean;
  ms: number;
  cached: boolean;
}

export interface TileError {
  id?: string;
  title?: string;
  message: string;
}

export interface StreamHandlers {
  /** Fired once, before any data — use it to render skeletons in order. */
  onMeta?: (meta: { tiles: TileMeta[]; params: Record<string, unknown> }) => void;
  /** Fired per tile as each query finishes. */
  onTile?: (tile: TileResult) => void;
  /** Fired per failed tile; the rest of the dashboard keeps loading. */
  onError?: (err: TileError) => void;
  /** Fired once when every tile has been attempted. */
  onDone?: (info: { ms: number }) => void;
}

export type TileParams = Record<string, string | number | undefined | null>;

function buildQuery(params: TileParams): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/**
 * Stream a dashboard's tiles. Returns a promise that resolves when the stream
 * completes. Pass an AbortSignal to cancel (the backend stops querying on
 * client disconnect, so cancelling actually frees DB connections).
 */
export async function streamDashboardTiles(
  dashboardId: string,
  params: TileParams = {},
  handlers: StreamHandlers = {},
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/api/dashboards/${dashboardId}/stream${buildQuery(params)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    signal,
  });

  // Auth/permission/param failures arrive as a normal JSON error response,
  // because the backend validates everything before flushing the stream.
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Dashboard stream failed (${res.status})`);
  }
  if (!res.body) throw new Error('Streaming is not supported in this browser');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return; // ignore malformed line rather than killing the whole dashboard
    }
    switch (msg.type) {
      case 'meta':
        handlers.onMeta?.({
          tiles: (msg.tiles as TileMeta[]) || [],
          params: (msg.params as Record<string, unknown>) || {},
        });
        break;
      case 'tile':
        handlers.onTile?.(msg as unknown as TileResult);
        break;
      case 'error':
        handlers.onError?.(msg as unknown as TileError);
        break;
      case 'done':
        handlers.onDone?.({ ms: Number(msg.ms) || 0 });
        break;
      default:
        break;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // NDJSON: process every complete line, keep the partial tail buffered.
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
  }
  if (buffer.trim()) handleLine(buffer);
}

/** Fetch a single tile (handy for retrying one that failed). */
export async function fetchTile<T = Record<string, unknown>>(
  dashboardId: string,
  tileId: string,
  params: TileParams = {}
): Promise<TileResult<T>> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/api/dashboards/${dashboardId}/tiles/${tileId}${buildQuery(params)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' }
  );
  if (!res.ok) {
    if (res.status === 401) redirectToLogin();
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Tile request failed (${res.status})`);
  }
  return res.json() as Promise<TileResult<T>>;
}

// ---------------------------------------------------------------------------
// Cookie-session fetch helper (AI-Access-Hub domain + auth session)
// ---------------------------------------------------------------------------

interface SessionRequestOpts {
  params?: Record<string, unknown>;
  body?: unknown;
}

async function sessionFetch<T>(method: string, path: string, opts: SessionRequestOpts = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}/api${path}`, window.location.origin);
  if (opts.params) {
    for (const [key, value] of Object.entries(opts.params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    credentials: 'include',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const err: any = new Error(data?.error || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return data as T;
}

/**
 * Same as sessionFetch, but for calls made mid-session against an
 * already-authenticated-protected endpoint: a 401 here means the session
 * expired, so it forces a redirect to /login. NOT used by getSession/
 * sessionLogin — a 401 there is the normal "not logged in yet"/"wrong
 * password" case, which the login page and route guards already handle.
 */
async function protectedFetch<T>(method: string, path: string, opts: SessionRequestOpts = {}): Promise<T> {
  try {
    return await sessionFetch<T>(method, path, opts);
  } catch (err: any) {
    if (err?.response?.status === 401) redirectToLogin();
    throw err;
  }
}

/**
 * Generic axios-compatible shim for the AI-Access-Hub pages (Dashboard,
 * UsersRoles, ApiKeys, ModelRegistry, Permissions, AuditLog) — kept as a
 * `{get,post,...}` object since those pages call arbitrary endpoint paths
 * rather than one function per endpoint.
 */
export const api = {
  get: (path: string, opts?: { params?: Record<string, unknown> }) =>
    protectedFetch<any>('GET', path, opts).then((data) => ({ data })),
  post: (path: string, body?: unknown) => protectedFetch<any>('POST', path, { body }).then((data) => ({ data })),
  patch: (path: string, body?: unknown) => protectedFetch<any>('PATCH', path, { body }).then((data) => ({ data })),
  put: (path: string, body?: unknown) => protectedFetch<any>('PUT', path, { body }).then((data) => ({ data })),
  delete: (path: string) => protectedFetch<any>('DELETE', path).then((data) => ({ data })),
};

// ---- Session (cookie-based login, used by SessionContext) ----

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  department: string;
  isSystemAdmin: boolean;
  canAccessAdminPortal: boolean;
}

export const getSession = () => sessionFetch<{ user: SessionUser }>('GET', '/auth/me');

export const sessionLogin = (email: string, password: string) =>
  sessionFetch<{ user: SessionUser }>('POST', '/auth/login', { body: { email, password } });

export const sessionLogout = () => sessionFetch<{ ok: boolean }>('POST', '/auth/logout');

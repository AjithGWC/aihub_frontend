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

const TOKEN_KEY = 'ads_token';
const USER_KEY = 'ads_user';

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

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (init.body && typeof init.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---- Auth ----

export const login = (username: string, password: string) =>
  apiFetch<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiFetch<{ ok: boolean }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

// ---- Dashboards & data ----

export const getDashboards = () => apiFetch<DashboardMeta[]>('/api/dashboards');

// runQuery() was removed deliberately.
//
// Dashboards must not send SQL. /api/data/query is now service-key only, so any
// browser call would return 403. Declare queries in a tile manifest
// (backend/data/tiles/<dashboard-id>.json) and read them with:
//
//   import { useDashboardTiles } from '../hooks/useDashboardTiles';
//   const { tiles, status } = useDashboardTiles('<dashboard-id>', { month });
//
// See frontend/src/api/tiles.ts for the streaming client.

// ---- Sharing / access ----

export const getUserOptions = () => apiFetch<UserOption[]>('/api/users/options');

export const getDashboardAccess = (dashboardId: string) =>
  apiFetch<AccessGrant[]>(`/api/dashboards/${encodeURIComponent(dashboardId)}/access`);

export const grantAccess = (dashboardId: string, username: string, level: AccessLevel) =>
  apiFetch<{ ok: boolean }>(`/api/dashboards/${encodeURIComponent(dashboardId)}/access`, {
    method: 'POST',
    body: JSON.stringify({ username, level }),
  });

export const revokeAccess = (dashboardId: string, userId: number) =>
  apiFetch<{ ok: boolean }>(
    `/api/dashboards/${encodeURIComponent(dashboardId)}/access/${userId}`,
    { method: 'DELETE' }
  );

// ---- Admin: user management ----

export const getUsers = () => apiFetch<ManagedUser[]>('/api/users');

export const createUser = (username: string, password: string, role: 'admin' | 'user') =>
  apiFetch<{ ok: boolean }>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });

export const updateUser = (id: number, patch: { role?: 'admin' | 'user'; password?: string }) =>
  apiFetch<{ ok: boolean }>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const deleteUser = (id: number) =>
  apiFetch<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' });

export const getUserAccess = (id: number) =>
  apiFetch<UserAccessGrant[]>(`/api/users/${id}/access`);

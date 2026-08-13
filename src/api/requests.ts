// Every API call that isn't already covered by client.ts's exported helpers
// (client.ts is shared/owned elsewhere) lives here instead of being
// duplicated ad hoc inside individual pages. Components call these
// functions rather than writing their own fetch().

import { API_BASE_URL } from '@/lib/apiBase';
import { getToken, type ManagedUser } from './client';

async function authFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string;
    };
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---- Admin: single user + data scope (admin/users/:id) ----

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

export const getUserDetail = (id: number) => authFetch<ManagedUser>(`/api/users/${id}`);

export const getScopeOptions = () => authFetch<ScopeDimension[]>('/api/users/scope-options');

export const getUserScope = (id: number) => authFetch<UserScopeResponse>(`/api/users/${id}/scope`);

export const saveUserScope = (id: number, scopes: Record<string, string[]>) =>
  authFetch<{ ok: boolean; enforced?: boolean }>(`/api/users/${id}/scope`, {
    method: 'PUT',
    body: JSON.stringify({ scopes }),
  });

// ---- My profile (used by /profile) ----

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

export const getMyProfile = () => authFetch<MyProfile>('/api/auth/me');

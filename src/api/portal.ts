// Client for the Admin/Developer Portal API (admin.json), a cookie-session
// service living at ADMIN_API_BASE with every route already prefixed
// `/portal/...`. Every function here corresponds to one operation in that
// swagger — see admin.json for exact request/response shapes.

import { ADMIN_API_BASE, redirectToLogin } from '@/lib/apiBase';

interface RequestOpts {
  params?: Record<string, unknown>;
  body?: unknown;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(`${ADMIN_API_BASE}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawFetch(method: string, path: string, opts: RequestOpts = {}) {
  const res = await fetch(buildUrl(path, opts.params), {
    method,
    credentials: 'include',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const err: any = new Error(data?.detail?.[0]?.msg || data?.error || data?.message || res.statusText);
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

/** Login/me/logout: a 401 here just means "not logged in yet" — never redirects. */
async function authFetch<T>(method: string, path: string, opts: RequestOpts = {}): Promise<T> {
  return rawFetch(method, path, opts) as Promise<T>;
}

/** Every other portal call: a 401 mid-session means the session expired. */
async function portalFetch<T>(method: string, path: string, opts: RequestOpts = {}): Promise<T> {
  try {
    return (await rawFetch(method, path, opts)) as T;
  } catch (err: any) {
    if (err?.response?.status === 401) redirectToLogin();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface PortalUser {
  user_id: string;
  username: string;
  department: string | null;
  roles: string[];
}

export const portalLogin = (username: string, password: string) =>
  authFetch<PortalUser>('POST', '/portal/auth/login', { body: { username, password } });

export const portalLogout = () => authFetch<void>('POST', '/portal/auth/logout');

export const portalMe = () => authFetch<PortalUser>('GET', '/portal/auth/me');

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface PortalUserOut {
  user_id: string;
  username: string;
  email: string | null;
  department: string | null;
  status: string;
  roles: string[];
  created_at: string;
  updated_at: string;
}

export const listUsers = () => portalFetch<PortalUserOut[]>('GET', '/portal/users/');

export const createUser = (body: {
  username: string;
  email?: string | null;
  department?: string | null;
  roles?: string[];
  password?: string | null;
}) => portalFetch<PortalUserOut>('POST', '/portal/users/', { body });

export const getUser = (userId: string) => portalFetch<PortalUserOut>('GET', `/portal/users/${userId}`);

export const updateUserStatus = (userId: string, status: string) =>
  portalFetch<PortalUserOut>('PATCH', `/portal/users/${userId}`, { body: { status } });

export const deactivateUser = (userId: string) => portalFetch<void>('DELETE', `/portal/users/${userId}`);

export const replaceUserRoles = (userId: string, roles: string[]) =>
  portalFetch<PortalUserOut>('PATCH', `/portal/users/${userId}/roles`, { body: { roles } });

export const resetUserPassword = (userId: string, password: string) =>
  portalFetch<PortalUserOut>('PATCH', `/portal/users/${userId}/password`, { body: { password } });

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export interface ApiKeyOut {
  key_id: string;
  key_prefix: string;
  label: string | null;
  status: string;
  expires_at: string | null;
  rate_limit_rpm: number;
  created_at: string;
  last_used_at: string | null;
  model_entitlements: string[];
}

export interface ApiKeyWithOwner extends ApiKeyOut {
  user_id: string;
  owner_username: string;
}

export interface ApiKeyCreated extends ApiKeyOut {
  raw_key: string;
}

export const listAllKeys = () => portalFetch<ApiKeyWithOwner[]>('GET', '/portal/keys/');

export const listUserKeys = (userId: string) => portalFetch<ApiKeyOut[]>('GET', `/portal/users/${userId}/keys`);

export const createUserKey = (
  userId: string,
  body: { label?: string | null; model_entitlements?: string[]; expires_at?: string | null; rate_limit_rpm?: number }
) => portalFetch<ApiKeyCreated>('POST', `/portal/users/${userId}/keys`, { body });

export const revokeUserKey = (userId: string, keyId: string) =>
  portalFetch<ApiKeyOut>('DELETE', `/portal/users/${userId}/keys/${keyId}`);

export const patchKeyModels = (userId: string, keyId: string, modelEntitlements: string[]) =>
  portalFetch<ApiKeyOut>('PATCH', `/portal/users/${userId}/keys/${keyId}/models`, {
    body: { model_entitlements: modelEntitlements },
  });

export const patchKeyRateLimit = (userId: string, keyId: string, rateLimitRpm: number) =>
  portalFetch<ApiKeyOut>('PATCH', `/portal/users/${userId}/keys/${keyId}/rate-limit`, {
    body: { rate_limit_rpm: rateLimitRpm },
  });

// ---------------------------------------------------------------------------
// Roles & permissions
// ---------------------------------------------------------------------------

export interface RoleOut {
  role_name: string;
  description: string | null;
}

export type PolicyMatrix = Record<string, Record<string, boolean>>;

export const listRoles = () => portalFetch<RoleOut[]>('GET', '/portal/roles/');

export const getRolePermissions = (role: string) =>
  portalFetch<{ role_name: string; permissions: Record<string, boolean> }>('GET', `/portal/roles/${role}/permissions`);

export const patchRolePermissions = (role: string, permissions: Record<string, boolean>) =>
  portalFetch<{ role_name: string; permissions: Record<string, boolean> }>('PATCH', `/portal/roles/${role}/permissions`, {
    body: { permissions },
  });

export const getPolicyMatrix = () => portalFetch<PolicyMatrix>('GET', '/portal/policy/matrix');

// ---------------------------------------------------------------------------
// Model registry
// ---------------------------------------------------------------------------

export interface PortalModel {
  name: string;
  version: string;
  backend: string;
  endpoint: string;
  tasks: string[];
  status: 'active' | 'retired' | 'staging' | string;
  vram_required_gb?: number | null;
  max_context_length?: number | null;
  fallback_model?: string | null;
  notes?: string | null;
  api_key_set?: boolean;
}

export const listModels = () => portalFetch<PortalModel[]>('GET', '/portal/models');

export const registerModel = (body: {
  name: string;
  version: string;
  backend: string;
  endpoint: string;
  tasks: string[];
  status?: string;
  vram_required_gb?: number | null;
  max_context_length?: number | null;
  fallback_model?: string | null;
  notes?: string | null;
  api_key?: string | null;
}) => portalFetch<PortalModel>('POST', '/portal/models', { body });

export const updateModelStatus = (name: string, status: string) =>
  portalFetch<PortalModel>('PATCH', `/portal/models/${encodeURIComponent(name)}/status`, { body: { status } });

export const setModelApiKey = (name: string, apiKey: string) =>
  portalFetch<{ api_key_set: boolean }>('PATCH', `/portal/models/${encodeURIComponent(name)}/api-key`, {
    body: { api_key: apiKey },
  });

export interface OllamaSyncResult {
  pulled: string | null;
  ollama_models: string[];
  registered: string[];
  already_registered: string[];
  failed: Record<string, string>;
}

export const syncOllama = (body: { model?: string | null; tasks?: string[] } = {}) =>
  portalFetch<OllamaSyncResult>('POST', '/portal/models/sync-ollama', { body });

// ---------------------------------------------------------------------------
// Audit / governance / metrics
// ---------------------------------------------------------------------------

/** Audit event shape is declared opaque (`{}`) in the swagger — read fields defensively. */
export type RawAuditEvent = Record<string, unknown>;

export const listAuditEvents = (params: { from?: string; to?: string; limit?: number } = {}) =>
  portalFetch<RawAuditEvent[]>('GET', '/portal/audit/events', { params });

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GovernanceSummary {
  total_events: number;
  by_outcome: Record<string, number>;
  by_layer: Record<string, number>;
  requests_blocked_total: number;
  blocked_by_reason: Record<string, number>;
  injection_flagged_total: number;
  pii_detections_total: number;
  token_usage: TokenUsage;
  model_usage: Record<string, number>;
}

export const getGovernanceSummary = (params: { from?: string; to?: string } = {}) =>
  portalFetch<GovernanceSummary>('GET', '/portal/governance/summary', { params });

/** Metrics summary shape is declared opaque (`{}`) in the swagger — read fields defensively. */
export type RawMetricsSummary = Record<string, unknown>;

export const getMetricsSummary = () => portalFetch<RawMetricsSummary>('GET', '/portal/metrics/summary');

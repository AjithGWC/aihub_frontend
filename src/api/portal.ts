// Client for the Admin/Developer Portal API (admin.json), a cookie-session
// service living at ADMIN_API_BASE with every route already prefixed
// `/portal/...`. Every function here corresponds to one operation in that
// swagger — see admin.json for exact request/response shapes.

import { ADMIN_API_BASE, extractErrorMessage, redirectToLogin } from '@/lib/apiBase';

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
    const err: any = new Error(extractErrorMessage(data, res.statusText));
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

// Note: GET /portal/policy/matrix exists in the swagger but is service-to-service
// only (401s for a normal admin session) — Permissions.tsx builds the same shape
// from listRoles() + getRolePermissions() per role instead.

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
  /** Present in /portal/chat/models — true if the current user is entitled to use this model. */
  entitled?: boolean;
}

export const listModels = () => portalFetch<PortalModel[]>('GET', '/portal/models');

/** Returns the active model list filtered by the current session's API key model entitlements. */
export const listChatModels = () => portalFetch<PortalModel[]>('GET', '/portal/chat/models');

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
// Chat sessions (conversation history) — cookie-session auth, same as every
// other portal route. The backend keeps each session's message history
// server-side against `session_id`; a completion request only ever needs to
// carry the new turn(s), not the full transcript.
// ---------------------------------------------------------------------------

export interface ChatTurnMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  session_id: string;
  title: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatTurnMessage[];
}

export interface ChatSessionCompletionRequest {
  model?: string;
  messages: ChatTurnMessage[];
  temperature?: number;
}

export interface ChatStreamHandlers {
  onDelta: (text: string) => void;
  onDone: (finishReason: string) => void;
  onError: (message: string) => void;
}

export const createChatSession = (model?: string | null) =>
  portalFetch<ChatSession>('POST', '/portal/chat/sessions', { body: { model: model || null } });

export const listChatSessions = () =>
  portalFetch<{ sessions: ChatSession[] }>('GET', '/portal/chat/sessions').then((res) => res.sessions);

export const getChatSession = (sessionId: string) =>
  portalFetch<ChatSessionDetail>('GET', `/portal/chat/sessions/${encodeURIComponent(sessionId)}`);

export const deleteChatSession = (sessionId: string) =>
  portalFetch<void>('DELETE', `/portal/chat/sessions/${encodeURIComponent(sessionId)}`);

/**
 * Streams one turn of a chat session as Server-Sent Events. `req.messages`
 * should contain only the new turn(s) — the backend prepends the session's
 * stored history itself. Returns an abort function.
 */
export function streamSessionChatCompletion(
  sessionId: string,
  req: ChatSessionCompletionRequest,
  handlers: ChatStreamHandlers
): () => void {
  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch(buildUrl(`/portal/chat/sessions/${encodeURIComponent(sessionId)}/completions`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req, stream: true }),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      handlers.onError(err instanceof Error ? err.message : String(err));
      return;
    }

    if (res.status === 401) {
      redirectToLogin();
      return;
    }

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => undefined);
      handlers.onError(extractErrorMessage(data, res.statusText || `Request failed (${res.status})`));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);

          const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
          if (!dataLine) continue;
          const data = dataLine.slice(5).trim();
          if (data === '[DONE]') return;

          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }

          if (parsed?.error) {
            handlers.onError(parsed.error?.message || parsed.error?.code || 'Stream error');
            return;
          }

          const choice = parsed?.choices?.[0];
          const content = choice?.delta?.content;
          if (typeof content === 'string' && content.length > 0) {
            handlers.onDelta(content);
          }
          if (typeof choice?.finish_reason === 'string') {
            handlers.onDone(choice.finish_reason);
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      handlers.onError(err instanceof Error ? err.message : String(err));
    }
  })();

  return () => controller.abort();
}

// ---------------------------------------------------------------------------
// Audit / governance / metrics
// ---------------------------------------------------------------------------

/**
 * Response schema is declared opaque (`{}`) in the swagger, but the live
 * shape (confirmed against the running Audit Store) is a fixed record per
 * event — not the generic/guessable shape assumed earlier. Nullable fields
 * are genuinely null in practice (e.g. user_id/department/model_used on a
 * pre-auth block, error_code on a passed request).
 */
export interface AuditEvent {
  audit_id: string;
  request_id: string;
  timestamp_utc: string;
  user_id: string | null;
  department: string | null;
  model_used: string | null;
  layer: string;
  event_type: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  pii_actions: string[];
  policy_decisions: string[];
  outcome: 'pass' | 'block' | 'error' | string;
  error_code: string | null;
}

export const listAuditEvents = (params: { from?: string; to?: string; limit?: number; offset?: number } = {}) =>
  portalFetch<{ events: AuditEvent[] }>('GET', '/portal/audit/events', { params }).then((res) => res.events);

export const getAuditByRequest = (requestId: string) =>
  portalFetch<{ events: AuditEvent[] }>('GET', `/portal/audit/requests/${requestId}`).then((res) => res.events);

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

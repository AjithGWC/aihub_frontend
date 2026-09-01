// Absolute backend origin, baked in at build time from VITE_BACKEND_URL.
// Every API call in the app must go through this — no bare "/api/..." paths,
// since a static deploy has no dev-server proxy to resolve them.
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? '';

// Admin/Developer Portal API — cookie-session auth, routes already prefixed `/portal/...`.
export const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_BACKEND_URL ?? '';

// A protected call came back 401 — the session is gone (expired/never existed).
// Full reload rather than router navigation: simplest way to force every piece
// of cached auth state (React context, in-memory data) to reset from scratch.
export function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

/**
 * Pull a human-readable message out of an error JSON body. Both backends use
 * a `detail`/`error` field, but inconsistently — sometimes a plain string,
 * sometimes `{message, ...}`, sometimes FastAPI's own `[{msg}, ...]`
 * validation-error array. Any of those handed straight to `new Error(x)`
 * that isn't a string gets coerced via `toString()`, which for a plain
 * object silently produces the literal text "[object Object]".
 */
export function extractErrorMessage(data: any, fallback: string): string {
  const detail = data?.detail;
  if (Array.isArray(detail)) return detail[0]?.msg || fallback;
  if (detail && typeof detail === 'object') return detail.message || detail.error || fallback;
  if (typeof detail === 'string') return detail;

  const error = data?.error;
  if (error && typeof error === 'object') return error.message || error.code || fallback;
  if (typeof error === 'string') return error;

  return data?.message || fallback;
}

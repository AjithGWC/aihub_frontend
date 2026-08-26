// Absolute backend origin, baked in at build time from VITE_BACKEND_URL.
// Every API call in the app must go through this — no bare "/api/..." paths,
// since a static deploy has no dev-server proxy to resolve them.
export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? '';

// Admin/Developer Portal API — cookie-session auth, routes already prefixed `/portal/...`.
export const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_BACKEND_URL ?? '';

// OpenAI-compatible chat gateway — Bearer API-key auth, routes prefixed `/v1/...`.
export const GATEWAY_API_BASE = import.meta.env.VITE_GATEWAY_BACKEND_URL ?? '';

// A protected call came back 401 — the session is gone (expired/never existed).
// Full reload rather than router navigation: simplest way to force every piece
// of cached auth state (React context, in-memory data) to reset from scratch.
export function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

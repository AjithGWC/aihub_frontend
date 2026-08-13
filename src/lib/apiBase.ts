// Absolute backend origin, baked in at build time from BACKEND_URL.
// Every API call in the app must go through this — no bare "/api/..." paths,
// since a static deploy has no dev-server proxy to resolve them.
export const API_BASE_URL = import.meta.env.BACKEND_URL ?? '';

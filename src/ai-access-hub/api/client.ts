// Minimal axios-compatible shim over fetch — avoids adding axios as a new
// dependency just to reuse AI-Access-Hub's pages verbatim. Proxied to
// AI-Access-Hub's own backend; see AIH_BACKEND_URL in vite.config.ts.

const BASE_URL = '/api'

interface RequestOpts {
  params?: Record<string, unknown>
}

function buildUrl(path: string, params?: Record<string, unknown>) {
  const url = new URL(BASE_URL + path, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function request(method: string, path: string, opts: RequestOpts & { body?: unknown } = {}) {
  const res = await fetch(buildUrl(path, opts.params), {
    method,
    credentials: 'include',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  const data = await res.json().catch(() => undefined)
  if (!res.ok) {
    const err: any = new Error(data?.error || res.statusText)
    err.response = { status: res.status, data }
    throw err
  }
  return { data }
}

export const api = {
  get: (path: string, opts?: RequestOpts) => request('GET', path, opts),
  post: (path: string, body?: unknown) => request('POST', path, { body }),
  patch: (path: string, body?: unknown) => request('PATCH', path, { body }),
  put: (path: string, body?: unknown) => request('PUT', path, { body }),
  delete: (path: string) => request('DELETE', path),
}

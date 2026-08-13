/**
 * Tile streaming client.
 *
 * Dashboards no longer send SQL. They ask the backend for a dashboard's tiles
 * and render each one as soon as it arrives over an NDJSON stream.
 *
 * We use fetch() + ReadableStream rather than EventSource because EventSource
 * cannot set an Authorization header — it would force the JWT into the query
 * string, where it leaks into server logs and browser history.
 */
import { getToken } from './client';
import { API_BASE_URL } from '@/lib/apiBase';

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
    signal,
  });

  // Auth/permission/param failures arrive as a normal JSON error response,
  // because the backend validates everything before flushing the stream.
  if (!res.ok) {
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
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Tile request failed (${res.status})`);
  }
  return res.json() as Promise<TileResult<T>>;
}

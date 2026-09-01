/**
 * useDashboardTiles — progressive tile loading for a dashboard.
 *
 * Each tile lands in state the moment its query finishes, so the page paints
 * incrementally instead of waiting for the slowest query.
 *
 * Usage inside a dashboard component:
 *
 *   const { tiles, errors, status, isLoading } = useDashboardTiles('ceo-decision', { month });
 *   const kpis = tiles['kpis']?.rows ?? [];
 *   if (status['kpis'] === 'loading') return <Skeleton />;
 */
import { useEffect, useRef, useState } from 'react';
import {
  streamDashboardTiles,
  type TileMeta,
  type TileParams,
  type TileResult,
} from '@/api';

export type TileStatus = 'loading' | 'ready' | 'error';

export interface UseDashboardTilesResult {
  /** Completed tiles keyed by tile id. */
  tiles: Record<string, TileResult>;
  /** Per-tile error messages keyed by tile id. */
  errors: Record<string, string>;
  /** Per-tile status keyed by tile id. */
  status: Record<string, TileStatus>;
  /** Declared tile order from the manifest (for stable skeleton layout). */
  order: TileMeta[];
  /** True until the stream completes. */
  isLoading: boolean;
  /** Fatal error (auth, permission, bad params) — nothing rendered. */
  fatalError: string | null;
  /** Total stream duration in ms once finished. */
  elapsedMs: number | null;
  /** Re-run the stream (bypasses nothing; server cache still applies). */
  reload: () => void;
}

export function useDashboardTiles(
  dashboardId: string,
  params: TileParams = {}
): UseDashboardTilesResult {
  const [tiles, setTiles] = useState<Record<string, TileResult>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, TileStatus>>({});
  const [order, setOrder] = useState<TileMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  // Serialise params so the effect re-runs when a filter changes.
  const paramKey = JSON.stringify(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setTiles({});
    setErrors({});
    setStatus({});
    setElapsedMs(null);
    setFatalError(null);
    setIsLoading(true);

    streamDashboardTiles(
      dashboardId,
      paramsRef.current,
      {
        onMeta: ({ tiles: metaTiles }) => {
          if (cancelled) return;
          setOrder(metaTiles);
          // Everything starts as loading so the UI can lay out skeletons.
          setStatus(
            Object.fromEntries(metaTiles.map((t) => [t.id, 'loading' as TileStatus]))
          );
        },
        onTile: (tile) => {
          if (cancelled) return;
          setTiles((prev) => ({ ...prev, [tile.id]: tile }));
          setStatus((prev) => ({ ...prev, [tile.id]: 'ready' }));
        },
        onError: (err) => {
          if (cancelled || !err.id) return;
          setErrors((prev) => ({ ...prev, [err.id as string]: err.message }));
          setStatus((prev) => ({ ...prev, [err.id as string]: 'error' }));
        },
        onDone: ({ ms }) => {
          if (cancelled) return;
          setElapsedMs(ms);
          setIsLoading(false);
        },
      },
      controller.signal
    ).catch((err: unknown) => {
      if (cancelled || controller.signal.aborted) return;
      setFatalError(err instanceof Error ? err.message : 'Failed to load dashboard');
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      // Aborting tells the backend to stop querying and release DB connections.
      controller.abort();
    };
  }, [dashboardId, paramKey, nonce]);

  return {
    tiles,
    errors,
    status,
    order,
    isLoading,
    fatalError,
    elapsedMs,
    reload: () => setNonce((n) => n + 1),
  };
}

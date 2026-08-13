// Shared kit for AI-generated dashboards: formatters, themed AG Grid table (with Excel
// export), skeleton loading placeholders, and color/heatmap helpers. Not a dashboard
// itself — registry.ts globs only './*.tsx' at the dashboards root, so this file (and
// this whole _shared/ folder) is never picked up as a plugin.
import { CSSProperties, useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  themeQuartz,
  type GridApi,
} from 'ag-grid-community';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);

// ---- Theme (maps AG Grid's Theming API to this app's CSS variables, so tables follow
// the light/dark toggle automatically without a separate dark/light theme object). ----
export const gridTheme = themeQuartz.withParams({
  accentColor: 'var(--primary)',
  backgroundColor: 'var(--panel)',
  foregroundColor: 'var(--text)',
  borderColor: 'var(--border)',
  chromeBackgroundColor: 'var(--panel-2)',
  headerBackgroundColor: 'var(--panel-2)',
  headerTextColor: 'var(--muted)',
  oddRowBackgroundColor: 'var(--panel-2)',
  rowHoverColor: 'var(--panel-2)',
  fontFamily: 'inherit',
  fontSize: 13,
});

// ---- Number / currency formatting (shared across all dashboards) ----
export const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const num = new Intl.NumberFormat('en-IN');

export const formatCompact = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return inr.format(v);
};
export const formatPct = (pct: number | null | undefined): string => {
  if (pct == null || Number.isNaN(pct)) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
};

// ---- Colors ----
export const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#06b6d4', '#a855f7', '#ec4899', '#ef4444', '#84cc16'];
export const POSITIVE = '#10b981';
export const NEGATIVE = 'var(--danger)';

export function deltaColor(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return 'var(--muted)';
  return pct >= 0 ? POSITIVE : NEGATIVE;
}
export function deltaArrow(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return '';
  return pct >= 0 ? '▲' : '▼';
}

// Note: heatStyle/deltaCellStyle intentionally have no explicit CSSProperties return
// annotation — their plain object literals need to structurally satisfy both React's
// style prop (CSSProperties) and AG Grid's cellStyle callback (its own index-signature
// CellStyle type), and an explicit CSSProperties annotation breaks the latter.

/** Cell background for a heatmap column: intensity scales with value/max, capped so text stays legible. */
export function heatStyle(value: number, max: number, colorVar = 'var(--primary)') {
  if (!(value > 0) || !(max > 0)) return undefined;
  const intensity = Math.min(80, Math.round((value / max) * 80));
  return { background: `color-mix(in srgb, ${colorVar} ${intensity}%, transparent)` };
}
/** Text color for a signed delta value (green ≥0, red <0) — pair with a sign/arrow, never color alone. */
export function deltaCellStyle(value: number | null | undefined) {
  return { color: deltaColor(value), fontWeight: 600 };
}

// ---- Recharts shared style objects ----
export const tooltipStyle: CSSProperties = {
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
};
export const legendStyle: CSSProperties = { color: 'var(--muted)', fontSize: 13 };
export const selectStyle: CSSProperties = {
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  color: 'var(--text)',
  fontSize: 13,
  minWidth: 160,
};
export const filterLabelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--muted)' };

// ---- Row/value parsing helpers ----
export type Row = Record<string, unknown>;
export const n = (v: unknown): number => Number(v) || 0;
export const s = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));

// ---- Skeleton loading placeholders ----
// Injects one small stylesheet (a shimmer keyframe) on first use instead of editing the
// app's global styles.css, which dashboards must never touch.
let skeletonCssInjected = false;
function ensureSkeletonCss() {
  if (skeletonCssInjected || typeof document === 'undefined') return;
  skeletonCssInjected = true;
  const style = document.createElement('style');
  style.setAttribute('data-ads-skeleton', 'true');
  style.textContent = `@keyframes ads-skeleton-pulse{0%,100%{opacity:.55}50%{opacity:1}}
.ads-skeleton{background:var(--panel-2);border-radius:6px;animation:ads-skeleton-pulse 1.4s ease-in-out infinite}`;
  document.head.appendChild(style);
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number | string; width?: number | string; style?: CSSProperties }) {
  useEffect(() => {
    ensureSkeletonCss();
  }, []);
  return <div className="ads-skeleton" style={{ height, width, ...style }} />;
}

export function SkeletonKpiValue() {
  return <Skeleton height={28} width="60%" />;
}
export function SkeletonChart({ height = 280 }: { height?: number }) {
  return <Skeleton height={height} />;
}
export function SkeletonTable({ height = 320 }: { height?: number }) {
  return <Skeleton height={height} />;
}

/**
 * A card shell whose <h3> title renders immediately (static, never hidden behind a
 * loading gate), with a subtitle and body — pass a <Skeleton> as children while loading.
 */
export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      {subtitle && (
        <p className="muted small" style={{ marginTop: -10 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

// ---- Themed AG Grid table with a built-in "Export to Excel" button ----
export interface DataGridProps<T> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  /** Excel file name (without extension) written on export. */
  fileName: string;
  height?: number;
  emptyMessage?: string;
  /** Disable pagination for small fixed lists (e.g. division-level tables). */
  pagination?: boolean;
  pageSize?: number;
}

export function DataGrid<T extends Row>({
  rowData,
  columnDefs,
  fileName,
  height = 360,
  emptyMessage = 'No data for the selected period.',
  pagination = true,
  pageSize = 20,
}: DataGridProps<T>) {
  const gridApiRef = useRef<GridApi<T> | null>(null);

  const defaultColDef = useMemo<ColDef<T>>(() => ({ resizable: true, sortable: true, filter: true, flex: 1, minWidth: 120 }), []);

  const handleExport = useCallback(() => {
    const cols = columnDefs
      .filter((c): c is ColDef<T> & { field: string } => typeof c.field === 'string')
      .map((c) => ({ field: c.field, header: s(c.headerName, c.field) }));
    const data = rowData.map((row) => {
      const obj: Row = {};
      for (const c of cols) obj[c.header] = (row as Row)[c.field];
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }, [rowData, columnDefs, fileName]);

  if (rowData.length === 0) {
    return <div className="muted">{emptyMessage}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="btn" onClick={handleExport} type="button">
          Export to Excel
        </button>
      </div>
      <div style={{ height, width: '100%' }}>
        <AgGridReact<T>
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={pagination && rowData.length > pageSize}
          paginationPageSize={pageSize}
          paginationPageSizeSelector={false}
          animateRows
          onGridReady={(e) => {
            gridApiRef.current = e.api;
          }}
        />
      </div>
    </div>
  );
}

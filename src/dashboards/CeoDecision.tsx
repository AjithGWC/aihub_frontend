import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ColDef } from 'ag-grid-community';
import { useDashboardTiles } from '../hooks/useDashboardTiles';
import {
  Row,
  n,
  s,
  inr,
  num,
  formatCompact,
  formatPct,
  deltaColor,
  deltaArrow,
  deltaCellStyle,
  heatStyle,
  CHART_COLORS,
  NEGATIVE,
  tooltipStyle,
  legendStyle,
  selectStyle,
  filterLabelStyle,
  Card,
  DataGrid,
  Skeleton,
  SkeletonKpiValue,
  SkeletonChart,
  SkeletonTable,
} from './_shared/dashboardKit';
import { DrillChart, drillLevel } from './_shared/DrillChart';

// Store filtering (warehouse 1070 excluded) now happens in the tile manifest SQL.

function monthKey(d: unknown): string {
  return String(d).slice(0, 7); // "2026-06-01T..." -> "2026-06"
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function pctChange(cur: number, prior: number | null): number | null {
  if (prior == null || prior === 0) return null;
  return ((cur - prior) / prior) * 100;
}

interface StoreMonthRow {
  siteCode: number;
  siteName: string;
  month: string;
  revenue: number;
  gp: number;
  units: number;
  closingStock: number;
}
interface StoreDivMonthRow {
  siteName: string;
  division: string;
  month: string;
  revenue: number;
  gp: number;
}
interface ScorecardRow extends Row {
  siteCode: number;
  siteName: string;
  revenue: number;
  marginPct: number;
  momPct: number | null;
  signal: string;
}
interface DragRow extends Row {
  division: string;
  revenue: number;
  revenueMomPct: number | null;
  marginPct: number;
  marginPtDelta: number | null;
  flagged: boolean;
}
interface HeatRow extends Row {
  division: string;
  [store: string]: unknown;
}
// Drill-through level rows. `extends Row` gives them the index signature DrillChart
// needs, without losing the named fields the level callbacks read.
interface StoreTrendPointRow extends Row {
  month: string;
  revenue: number;
  gp: number;
}
interface StoreDivisionSliceRow extends Row {
  division: string;
  revenue: number;
  gp: number;
}

export default function CeoDecision() {
  // Data arrives per tile over an NDJSON stream — no SQL in the frontend.
  // Rollup measures are already sign-corrected (revenue/units positive).
  const { tiles, status, errors, fatalError } = useDashboardTiles('ceo-decision');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Each section shows its own skeleton until its tile lands.
  const loading = status['store-month'] !== 'ready' && status['store-month'] !== 'error';
  const loadingDiv = status['store-div-month'] !== 'ready' && status['store-div-month'] !== 'error';
  const error = errors['store-month'] || errors['store-div-month'] || null;

  const storeMonthRows: StoreMonthRow[] = useMemo(
    () =>
      ((tiles['store-month']?.rows ?? []) as Row[]).map((r) => ({
        siteCode: n(r.site_code),
        siteName: s(r.site_name),
        month: monthKey(r.start_date),
        revenue: n(r.revenue),
        gp: n(r.gp),
        units: n(r.units),
        closingStock: n(r.closing_stock),
      })),
    [tiles]
  );

  const storeDivMonthRows: StoreDivMonthRow[] = useMemo(
    () =>
      ((tiles['store-div-month']?.rows ?? []) as Row[]).map((r) => ({
        siteName: s(r.site_name),
        division: s(r.division),
        month: monthKey(r.start_date),
        revenue: n(r.revenue),
        gp: n(r.gp),
      })),
    [tiles]
  );

  const months = useMemo(() => Array.from(new Set(storeMonthRows.map((r) => r.month))).sort(), [storeMonthRows]);

  // Default to the latest month once the first tile arrives.
  useEffect(() => {
    if (!selectedMonth && months.length > 0) setSelectedMonth(months[months.length - 1]);
  }, [months, selectedMonth]);
  const priorMonth = useMemo(() => {
    const idx = months.indexOf(selectedMonth);
    return idx > 0 ? months[idx - 1] : null;
  }, [months, selectedMonth]);

  const kpis = useMemo(() => {
    if (!selectedMonth) return null;
    const cur = storeMonthRows.filter((r) => r.month === selectedMonth);
    const prior = priorMonth ? storeMonthRows.filter((r) => r.month === priorMonth) : [];
    const sum = (rows: StoreMonthRow[], key: keyof StoreMonthRow) => rows.reduce((acc, r) => acc + (r[key] as number), 0);
    const revenue = sum(cur, 'revenue');
    const revenuePrior = prior.length ? sum(prior, 'revenue') : null;
    const gp = sum(cur, 'gp');
    const gpPrior = prior.length ? sum(prior, 'gp') : null;
    const units = sum(cur, 'units');
    const unitsPrior = prior.length ? sum(prior, 'units') : null;
    const closingStock = sum(cur, 'closingStock');
    const closingStockPrior = prior.length ? sum(prior, 'closingStock') : null;
    const marginPct = revenue !== 0 ? (gp / revenue) * 100 : 0;
    const marginPctPrior = revenuePrior != null && revenuePrior !== 0 ? (gpPrior! / revenuePrior) * 100 : null;
    return {
      revenue,
      revenuePct: pctChange(revenue, revenuePrior),
      gp,
      gpPct: pctChange(gp, gpPrior),
      marginPct,
      marginPtDelta: marginPctPrior != null ? marginPct - marginPctPrior : null,
      units,
      unitsPct: pctChange(units, unitsPrior),
      closingStock,
      closingStockPct: pctChange(closingStock, closingStockPrior),
    };
  }, [storeMonthRows, selectedMonth, priorMonth]);

  const storeScorecard: ScorecardRow[] = useMemo(() => {
    if (!selectedMonth) return [];
    const cur = storeMonthRows.filter((r) => r.month === selectedMonth);
    const prior = priorMonth ? storeMonthRows.filter((r) => r.month === priorMonth) : [];
    const priorByCode = new Map(prior.map((r) => [r.siteCode, r]));
    const rows = cur.map((r) => {
      const p = priorByCode.get(r.siteCode) ?? null;
      const marginPct = r.revenue !== 0 ? (r.gp / r.revenue) * 100 : 0;
      return {
        siteCode: r.siteCode,
        siteName: r.siteName,
        revenue: r.revenue,
        marginPct,
        momPct: p ? pctChange(r.revenue, p.revenue) : null,
        signal: '—',
      };
    });
    const sorted = rows.sort((a, b) => b.revenue - a.revenue);
    if (sorted.length > 1) {
      sorted[0].signal = 'Top performer';
      sorted[sorted.length - 1].signal = 'Needs attention';
    }
    return sorted;
  }, [storeMonthRows, selectedMonth, priorMonth]);

  const departmentDrag: DragRow[] = useMemo(() => {
    if (!selectedMonth) return [];
    const cur = storeDivMonthRows.filter((r) => r.month === selectedMonth);
    const prior = priorMonth ? storeDivMonthRows.filter((r) => r.month === priorMonth) : [];
    const byDivision = new Map<string, { revenue: number; gp: number }>();
    for (const r of cur) {
      const e = byDivision.get(r.division) ?? { revenue: 0, gp: 0 };
      e.revenue += r.revenue;
      e.gp += r.gp;
      byDivision.set(r.division, e);
    }
    const priorByDivision = new Map<string, { revenue: number; gp: number }>();
    for (const r of prior) {
      const e = priorByDivision.get(r.division) ?? { revenue: 0, gp: 0 };
      e.revenue += r.revenue;
      e.gp += r.gp;
      priorByDivision.set(r.division, e);
    }
    const rows = Array.from(byDivision.entries())
      .filter(([, v]) => v.revenue !== 0)
      .map(([division, v]) => {
        const p = priorByDivision.get(division) ?? null;
        const marginPct = v.revenue !== 0 ? (v.gp / v.revenue) * 100 : 0;
        const priorMarginPct = p && p.revenue !== 0 ? (p.gp / p.revenue) * 100 : null;
        const revenueMomPct = p ? pctChange(v.revenue, p.revenue) : null;
        const marginPtDelta = priorMarginPct != null ? marginPct - priorMarginPct : null;
        return {
          division,
          revenue: v.revenue,
          revenueMomPct,
          marginPct,
          marginPtDelta,
          flagged: (revenueMomPct ?? 0) < 0 && (marginPtDelta ?? 0) < 0,
        };
      });
    return rows.sort((a, b) => (a.revenueMomPct ?? Infinity) - (b.revenueMomPct ?? Infinity));
  }, [storeDivMonthRows, selectedMonth, priorMonth]);

  const storeTrend = useMemo(() => {
    const storeNames = Array.from(new Set(storeMonthRows.map((r) => r.siteName)));
    const byMonth = new Map<string, Record<string, unknown>>();
    for (const r of storeMonthRows) {
      const point = byMonth.get(r.month) ?? { month: r.month };
      point[r.siteName] = r.revenue;
      byMonth.set(r.month, point);
    }
    return { storeNames, points: Array.from(byMonth.values()).sort((a, b) => (a.month as string).localeCompare(b.month as string)) };
  }, [storeMonthRows]);

  const heatTableData = useMemo(() => {
    if (!selectedMonth) return { storeNames: [] as string[], rows: [] as HeatRow[], max: 0 };
    const cur = storeDivMonthRows.filter((r) => r.month === selectedMonth);
    const storeNames = Array.from(new Set(cur.map((r) => r.siteName))).sort();
    const byDivision = new Map<string, Map<string, number>>();
    for (const r of cur) {
      if (r.revenue === 0) continue;
      const m = byDivision.get(r.division) ?? new Map<string, number>();
      m.set(r.siteName, r.revenue);
      byDivision.set(r.division, m);
    }
    const rows: HeatRow[] = Array.from(byDivision.entries())
      .map(([division, m]) => {
        const row: HeatRow = { division };
        for (const store of storeNames) row[store] = m.get(store) ?? 0;
        return row;
      })
      .sort((a, b) => storeNames.reduce((acc, st) => acc + (n(b[st]) - n(a[st])), 0));
    const max = Math.max(1, ...rows.flatMap((r) => storeNames.map((st) => n(r[st]))));
    return { storeNames, rows, max };
  }, [storeDivMonthRows, selectedMonth]);

  // ---- Drill-through: store bar -> that store's monthly trend line -> that month's
  // divisions. Every level reads rows that are already in `tiles`, so drilling costs
  // no extra query. Memoised so DrillChart doesn't recompute level data every render.
  const revenueDrillLevels = useMemo(
    () => [
      drillLevel<ScorecardRow>({
        kind: 'bar',
        title: `Revenue Drill-Down by Store${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`,
        subtitle: 'Click a store to see its 3-month trend, then click a month to see that month’s division mix.',
        data: storeScorecard,
        categoryKey: 'siteName',
        series: [{ key: 'revenue', name: 'Revenue', color: CHART_COLORS[0] }],
        drillKey: 'siteName',
        valueFormatter: formatCompact,
        emptyMessage: 'No store data for the selected month.',
      }),
      drillLevel<StoreTrendPointRow>({
        kind: 'line',
        title: (ctx) => `${ctx.value} — Revenue & Gross Profit Trend`,
        subtitle: 'Click a month to break it down by division.',
        data: (ctx) =>
          storeMonthRows
            .filter((r) => r.siteName === ctx.value)
            .sort((a, b) => a.month.localeCompare(b.month))
            .map((r) => ({ month: r.month, revenue: r.revenue, gp: r.gp })),
        categoryKey: 'month',
        series: [
          { key: 'revenue', name: 'Revenue', color: CHART_COLORS[0] },
          { key: 'gp', name: 'Gross Profit', color: CHART_COLORS[1] },
        ],
        drillKey: 'month',
        crumbLabel: (row) => monthLabel(row.month),
        categoryFormatter: monthLabel,
        valueFormatter: formatCompact,
        emptyMessage: 'No monthly history for this store.',
      }),
      drillLevel<StoreDivisionSliceRow>({
        // Leaf: no drillKey, so clicking a bar here does nothing.
        kind: 'bar',
        layout: 'vertical',
        height: 340,
        title: (ctx) => {
          const month = ctx.get('month');
          return `${ctx.get('siteName') ?? 'Store'} — Divisions${month ? ` in ${monthLabel(month)}` : ''}`;
        },
        subtitle: 'Top 12 divisions by revenue for the selected store and month.',
        data: (ctx) => {
          const store = ctx.get('siteName');
          const month = ctx.get('month');
          if (!store || !month) return [];
          const byDivision = new Map<string, { revenue: number; gp: number }>();
          for (const r of storeDivMonthRows) {
            if (r.siteName !== store || r.month !== month) continue;
            const e = byDivision.get(r.division) ?? { revenue: 0, gp: 0 };
            e.revenue += r.revenue;
            e.gp += r.gp;
            byDivision.set(r.division, e);
          }
          return Array.from(byDivision.entries())
            .filter(([, v]) => v.revenue !== 0)
            .map(([division, v]) => ({ division, revenue: v.revenue, gp: v.gp }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 12);
        },
        categoryKey: 'division',
        series: [
          { key: 'revenue', name: 'Revenue', color: CHART_COLORS[0] },
          { key: 'gp', name: 'Gross Profit', color: CHART_COLORS[1] },
        ],
        valueFormatter: formatCompact,
        emptyMessage: loadingDiv ? 'Loading division data…' : 'No division data for this store and month.',
      }),
    ],
    [storeScorecard, storeMonthRows, storeDivMonthRows, selectedMonth, loadingDiv]
  );

  const scorecardColumns: ColDef<ScorecardRow>[] = useMemo(() => {
    const maxRevenue = Math.max(1, ...storeScorecard.map((r) => r.revenue));
    return [
      { field: 'siteName', headerName: 'Store' },
      {
        field: 'revenue',
        headerName: 'Revenue',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxRevenue),
      },
      { field: 'marginPct', headerName: 'Margin %', valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%` },
      {
        field: 'momPct',
        headerName: 'MoM Growth',
        valueFormatter: (p) => `${deltaArrow(p.value)} ${formatPct(p.value)}`,
        cellStyle: (p) => deltaCellStyle(p.value),
      },
      {
        field: 'signal',
        headerName: 'Signal',
        cellStyle: (p) => ({ color: p.value === 'Top performer' ? '#10b981' : p.value === 'Needs attention' ? NEGATIVE : 'var(--muted)' }),
      },
    ];
  }, [storeScorecard]);

  const dragColumns: ColDef<DragRow>[] = useMemo(() => {
    const maxRevenue = Math.max(1, ...departmentDrag.map((r) => r.revenue));
    return [
      { field: 'division', headerName: 'Division' },
      {
        field: 'revenue',
        headerName: 'Revenue',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxRevenue),
      },
      {
        field: 'revenueMomPct',
        headerName: 'Rev MoM',
        valueFormatter: (p) => `${deltaArrow(p.value)} ${formatPct(p.value)}`,
        cellStyle: (p) => deltaCellStyle(p.value),
      },
      { field: 'marginPct', headerName: 'Margin %', valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%` },
      {
        field: 'marginPtDelta',
        headerName: 'Margin Δ (pt)',
        valueFormatter: (p) => (p.value != null ? `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}pt` : 'N/A'),
        cellStyle: (p) => deltaCellStyle(p.value),
      },
      {
        field: 'flagged',
        headerName: 'Flag',
        valueFormatter: (p) => (p.value ? '⚠ Falling revenue & margin' : '—'),
        cellStyle: (p) => ({ color: p.value ? NEGATIVE : 'var(--muted)' }),
      },
    ];
  }, [departmentDrag]);

  const heatColumns: ColDef<HeatRow>[] = useMemo(
    () => [
      { field: 'division', headerName: 'Division' },
      ...heatTableData.storeNames.map(
        (store): ColDef<HeatRow> => ({
          field: store,
          headerName: store,
          valueFormatter: (p) => (n(p.value) > 0 ? formatCompact(n(p.value)) : '—'),
          cellStyle: (p) => heatStyle(n(p.value), heatTableData.max),
        })
      ),
    ],
    [heatTableData.storeNames, heatTableData.max]
  );

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }
  if (error && months.length === 0 && !loading) {
    return <div className="error-box">{error}</div>;
  }

  return (
    <div>
      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={filterLabelStyle}>
          Month
          {loading ? (
            <Skeleton height={36} width={160} />
          ) : (
            <select style={selectStyle} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          )}
        </label>
        <p className="muted small" style={{ margin: 0 }}>
          M Baazar retail stores only (Vip, Gariahat, Andul Road) — warehouse excluded.
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Total Revenue{selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}</div>
          {loading ? (
            <SkeletonKpiValue />
          ) : (
            <>
              <div className="kpi-value">{formatCompact(kpis?.revenue ?? 0)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ color: deltaColor(kpis?.revenuePct ?? null), fontSize: 13, fontWeight: 600 }}>
                  {deltaArrow(kpis?.revenuePct ?? null)} {formatPct(kpis?.revenuePct ?? null)}
                </span>
                <span className="muted small">vs {priorMonth ? monthLabel(priorMonth) : 'prior month'}</span>
              </div>
            </>
          )}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Gross Profit{selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}</div>
          {loading ? (
            <SkeletonKpiValue />
          ) : (
            <>
              <div className="kpi-value">{formatCompact(kpis?.gp ?? 0)}</div>
              <div className="muted small" style={{ marginTop: 2 }}>Margin {(kpis?.marginPct ?? 0).toFixed(1)}%</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ color: deltaColor(kpis?.gpPct ?? null), fontSize: 13, fontWeight: 600 }}>
                  {deltaArrow(kpis?.gpPct ?? null)} {formatPct(kpis?.gpPct ?? null)}
                </span>
                <span className="muted small">
                  margin {kpis?.marginPtDelta != null ? `${kpis.marginPtDelta >= 0 ? '+' : ''}${kpis.marginPtDelta.toFixed(1)}pt` : 'N/A'}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Units Sold{selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}</div>
          {loading ? (
            <SkeletonKpiValue />
          ) : (
            <>
              <div className="kpi-value">{num.format(kpis?.units ?? 0)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ color: deltaColor(kpis?.unitsPct ?? null), fontSize: 13, fontWeight: 600 }}>
                  {deltaArrow(kpis?.unitsPct ?? null)} {formatPct(kpis?.unitsPct ?? null)}
                </span>
                <span className="muted small">vs {priorMonth ? monthLabel(priorMonth) : 'prior month'}</span>
              </div>
            </>
          )}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Closing Stock Value{selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}</div>
          {loading ? (
            <SkeletonKpiValue />
          ) : (
            <>
              <div className="kpi-value">{formatCompact(kpis?.closingStock ?? 0)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ color: deltaColor(kpis?.closingStockPct ?? null), fontSize: 13, fontWeight: 600 }}>
                  {deltaArrow(kpis?.closingStockPct ?? null)} {formatPct(kpis?.closingStockPct ?? null)}
                </span>
                <span className="muted small">vs {priorMonth ? monthLabel(priorMonth) : 'prior month'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <Card title={`Store Scorecard${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`} subtitle="Ranked by revenue. Green = top performer, red = under-performer that needs attention.">
        {loading ? (
          <SkeletonChart height={260} />
        ) : storeScorecard.length === 0 ? (
          <div className="muted">No data for the selected month.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={storeScorecard} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="siteName" interval={0} />
              <YAxis tickFormatter={(v: number) => formatCompact(v)} width={80} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => formatCompact(v)} />
              <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} fill={CHART_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={storeScorecard}
              columnDefs={scorecardColumns}
              fileName={`store-scorecard-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, storeScorecard.length * 42 + 56)}
              emptyMessage="No data for the selected month."
            />
          )}
        </div>
      </Card>

      <Card
        title={`Department Drag${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`}
        subtitle={`Divisions sorted by steepest revenue decline vs ${priorMonth ? monthLabel(priorMonth) : 'prior month'}. Flagged rows are falling in both revenue and margin.`}
      >
        {loadingDiv ? (
          <SkeletonChart height={280} />
        ) : departmentDrag.length === 0 ? (
          <div className="muted">No division data for the selected month.</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, departmentDrag.length * 30)}>
            <BarChart data={departmentDrag} layout="vertical" margin={{ left: 130 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v: number) => formatCompact(v)} />
              <YAxis type="category" dataKey="division" width={140} interval={0} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => formatCompact(v)} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} fill={CHART_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: 16 }}>
          {loadingDiv ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={departmentDrag}
              columnDefs={dragColumns}
              fileName={`department-drag-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, departmentDrag.length * 42 + 56)}
              emptyMessage="No division data for the selected month."
            />
          )}
        </div>
      </Card>

      <Card title="3-Month Revenue Trend by Store">
        {loading ? (
          <SkeletonChart height={320} />
        ) : storeTrend.points.length === 0 ? (
          <div className="muted">No trend data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={storeTrend.points} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={monthLabel} />
              <YAxis tickFormatter={(v: number) => formatCompact(v)} width={80} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} labelFormatter={monthLabel} formatter={(v: number) => formatCompact(v)} />
              <Legend wrapperStyle={legendStyle} />
              {storeTrend.storeNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} name={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title={`Store × Division Revenue${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`}>
        {loadingDiv ? (
          <SkeletonTable height={320} />
        ) : (
          <DataGrid
            rowData={heatTableData.rows}
            columnDefs={heatColumns}
            fileName={`store-division-revenue-${selectedMonth}`}
            pagination={false}
            height={Math.max(160, heatTableData.rows.length * 42 + 56)}
            emptyMessage="No data for the selected period."
          />
        )}
      </Card>

      <p className="muted small">
        Daily / target / projection views require daily POS data and a target table, which are not yet available in this dataset —
        this dashboard shows actuals only and does not fabricate targets or forecasts.
      </p>
    </div>
  );
}

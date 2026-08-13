import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import type { ColDef } from 'ag-grid-community';
import { useDashboardTiles } from '../hooks/useDashboardTiles';
import {
  Row,
  n,
  s,
  inr,
  num,
  tooltipStyle,
  selectStyle,
  filterLabelStyle,
  CHART_COLORS,
  NEGATIVE,
  heatStyle,
  Card,
  DataGrid,
  SkeletonChart,
  SkeletonTable,
} from './_shared/dashboardKit';

// Store scoping (warehouse 1070 excluded — its stock dwarfs store-level metrics)
// now happens in the tile manifest SQL.
const DEFAULT_MONTH_KEY = '2026-06';
const FAST_SELLER_MIN_UNITS = 20;
const LOW_COVER_MAX_DAYS = 30;

function monthKey(d: unknown): string {
  return String(d).slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

interface TopArticleRow {
  article: string;
  division: string;
  revenue: number;
  units: number;
  marginPct: number;
}
interface ParetoRow extends Row {
  article: string;
  division: string;
  revenue: number;
  units: number;
  marginPct: number;
  cumulativePct: number;
  rank: number;
}
interface SellThroughRow {
  division: string;
  sellThroughPct: number | null;
}
interface NonMoverRow extends Row {
  article: string;
  division: string;
  closingQty: number;
  closingValue: number;
}
interface RepeatCandidateRow extends Row {
  article: string;
  division: string;
  unitsSold: number;
  closingQty: number;
  daysOfCover: number;
}

export default function Merchandising() {
  const [selectedMonth, setSelectedMonth] = useState<string>(DEFAULT_MONTH_KEY);
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  // Data arrives per tile over an NDJSON stream — no SQL in the frontend.
  // Rollup measures are already sign-corrected (revenue/units positive).
  // An empty division is dropped from the query string, so the manifest's
  // "" default kicks in and the tiles cover every division.
  const { tiles, status, errors, fatalError, isLoading } = useDashboardTiles('merchandising', {
    month: `${selectedMonth}-01`,
    division: selectedDivision,
  });

  // Each section shows its own skeleton until its tile lands.
  const settled = (id: string) => status[id] === 'ready' || status[id] === 'error';
  const loadingSellThrough = !settled('sell-through');
  const loadingData = !settled('top-articles') || !settled('scope-revenue');
  const loadingNonMovers = !settled('non-movers');
  const loadingRepeat = !settled('repeat-candidates');
  const error =
    errors['months'] ||
    errors['sell-through'] ||
    errors['scope-revenue'] ||
    errors['top-articles'] ||
    errors['non-movers'] ||
    errors['repeat-candidates'] ||
    null;

  // The month list drives a filter, so it is kept in state: changing a param
  // restarts the stream and momentarily clears `tiles`.
  const [months, setMonths] = useState<string[]>([]);
  useEffect(() => {
    const rows = tiles['months']?.rows as Row[] | undefined;
    if (rows?.length) setMonths(rows.map((r) => monthKey(r.start_date)));
  }, [tiles]);
  const loadingInit = months.length === 0 && status['months'] !== 'error';

  // Sell-through by division: always shows every division for the selected month (division filter only highlights).
  const sellThrough: SellThroughRow[] = useMemo(
    () =>
      ((tiles['sell-through']?.rows ?? []) as Row[])
        .map((r) => ({ division: s(r.division), sellThroughPct: r.sell_through_pct == null ? null : n(r.sell_through_pct) }))
        .filter((r) => r.sellThroughPct != null),
    [tiles]
  );

  const totalRevenue: number = useMemo(
    () => n((tiles['scope-revenue']?.rows?.[0] as Row | undefined)?.total_revenue),
    [tiles]
  );

  const topArticles: TopArticleRow[] = useMemo(
    () =>
      ((tiles['top-articles']?.rows ?? []) as Row[]).map((r) => ({
        article: s(r.article),
        division: s(r.division),
        revenue: n(r.revenue),
        units: n(r.units),
        marginPct: n(r.revenue) !== 0 ? (n(r.gp) / n(r.revenue)) * 100 : 0,
      })),
    [tiles]
  );

  const nonMovers: NonMoverRow[] = useMemo(
    () =>
      ((tiles['non-movers']?.rows ?? []) as Row[]).map((r) => ({
        article: s(r.article),
        division: s(r.division),
        closingQty: n(r.closing_qty),
        closingValue: n(r.closing_value),
      })),
    [tiles]
  );

  const repeatCandidatesRaw: RepeatCandidateRow[] = useMemo(
    () =>
      ((tiles['repeat-candidates']?.rows ?? []) as Row[]).map((r) => ({
        article: s(r.article),
        division: s(r.division),
        unitsSold: n(r.units_sold),
        closingQty: n(r.closing_qty),
        daysOfCover: n(r.days_of_cover),
      })),
    [tiles]
  );

  const divisionOptions = useMemo(
    () => Array.from(new Set(sellThrough.map((r) => r.division))).sort(),
    [sellThrough]
  );

  const paretoRows: ParetoRow[] = useMemo(() => {
    let cum = 0;
    return topArticles
      .map((r) => {
        cum += r.revenue;
        return { ...r, cumulativePct: totalRevenue > 0 ? (cum / totalRevenue) * 100 : 0, rank: 0 };
      })
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [topArticles, totalRevenue]);

  const reachedAtLimit = paretoRows.length > 0 ? paretoRows[paretoRows.length - 1].cumulativePct : 0;

  const repeatCandidates: RepeatCandidateRow[] = useMemo(
    () =>
      repeatCandidatesRaw
        .filter((r) => r.daysOfCover <= LOW_COVER_MAX_DAYS)
        .sort((a, b) => a.daysOfCover - b.daysOfCover)
        .slice(0, 30),
    [repeatCandidatesRaw]
  );

  const paretoColumns: ColDef<ParetoRow>[] = useMemo(() => {
    const maxRevenue = Math.max(1, ...paretoRows.map((r) => r.revenue));
    return [
      { field: 'rank', headerName: '#', maxWidth: 80 },
      { field: 'article', headerName: 'Article' },
      { field: 'division', headerName: 'Division' },
      {
        field: 'revenue',
        headerName: 'Revenue',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxRevenue),
      },
      { field: 'units', headerName: 'Units', valueFormatter: (p) => num.format(p.value ?? 0) },
      { field: 'marginPct', headerName: 'Margin %', valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%` },
      { field: 'cumulativePct', headerName: 'Cumulative %', valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%` },
    ];
  }, [paretoRows]);

  const nonMoverColumns: ColDef<NonMoverRow>[] = useMemo(() => {
    const maxValue = Math.max(1, ...nonMovers.map((r) => r.closingValue));
    return [
      { field: 'article', headerName: 'Article' },
      { field: 'division', headerName: 'Division' },
      { field: 'closingQty', headerName: 'Closing Qty', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'closingValue',
        headerName: 'Closing Value',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => ({ ...heatStyle(p.value ?? 0, maxValue, NEGATIVE), color: NEGATIVE, fontWeight: 600 }),
      },
    ];
  }, [nonMovers]);

  const repeatCandidateColumns: ColDef<RepeatCandidateRow>[] = useMemo(
    () => [
      { field: 'article', headerName: 'Article' },
      { field: 'division', headerName: 'Division' },
      { field: 'unitsSold', headerName: 'Units Sold', valueFormatter: (p) => num.format(p.value ?? 0) },
      { field: 'closingQty', headerName: 'Closing Qty', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'daysOfCover',
        headerName: 'Days of Cover',
        valueFormatter: (p) => (p.value ?? 0).toFixed(1),
        cellStyle: () => ({ color: NEGATIVE, fontWeight: 600 }),
      },
    ],
    []
  );

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }
  if (loadingInit) {
    return <p className="muted">Loading merchandising dashboard…</p>;
  }
  if (error && months.length === 0) {
    return <div className="error-box">{error}</div>;
  }
  if (months.length === 0) {
    return <p className="muted">No data available for M Baazar stores yet.</p>;
  }

  return (
    <div>
      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={filterLabelStyle}>
          Month
          <select style={selectStyle} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          Division
          <select style={selectStyle} value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)}>
            <option value="">All Divisions</option>
            {divisionOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        {isLoading && <p className="muted small" style={{ margin: 0 }}>Updating…</p>}
        <p className="muted small" style={{ width: '100%', margin: 0 }}>
          M Baazar retail stores only (Vip, Gariahat, Andul Road) — warehouse excluded.
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <Card title="Winning colours/sizes not available">
        <p className="muted small" style={{ margin: 0 }}>
          The item master has no discrete colour/size attribute — &quot;article&quot; below is the finest breakdown the data
          supports (a style/price-band bucket), not an individual colour or size variant.
        </p>
      </Card>

      <Card
        title={`Top-80% Articles (Pareto) — ${monthLabel(selectedMonth)}${selectedDivision ? ` — ${selectedDivision}` : ''}`}
        subtitle={
          loadingData
            ? undefined
            : `Top ${paretoRows.length} articles by revenue, sorted descending. These reach ${reachedAtLimit.toFixed(1)}% of total scope revenue${
                reachedAtLimit < 80 ? ' — the catalog has a long tail, so 80% is not reached within this list' : ''
              }.`
        }
      >
        {loadingData ? (
          <SkeletonChart height={220} />
        ) : paretoRows.length === 0 ? (
          <div className="muted">No data for the selected scope.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={paretoRows} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rank" tickFormatter={(v: number) => `#${v}`} />
              <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={50} domain={[0, 100]} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--muted)' }}
                labelFormatter={(v: number) => `Rank #${v}`}
                formatter={(v: number) => [`${v.toFixed(1)}%`, 'Cumulative Revenue']}
              />
              <ReferenceLine y={80} strokeDasharray="4 4" label={{ value: '80%', position: 'right', fill: 'var(--muted)', fontSize: 12 }} />
              <Area type="monotone" dataKey="cumulativePct" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: 16 }}>
          {loadingData ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={paretoRows}
              columnDefs={paretoColumns}
              fileName={`pareto-articles-${selectedMonth}${selectedDivision ? `-${selectedDivision}` : ''}`}
              emptyMessage="No data for the selected scope."
            />
          )}
        </div>
      </Card>

      <Card
        title={`Sell-Through by Division — ${monthLabel(selectedMonth)}`}
        subtitle={`Sell-through % = units sold ÷ (opening stock + goods received). Shown for all divisions${
          selectedDivision ? `; ${selectedDivision} highlighted` : ''
        }.`}
      >
        {loadingSellThrough ? (
          <SkeletonChart height={300} />
        ) : sellThrough.length === 0 ? (
          <div className="muted">No sell-through data for the selected month.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sellThrough} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="division" angle={-30} textAnchor="end" interval={0} height={80} />
              <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={60} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="sellThroughPct" name="Sell-Through %" radius={[4, 4, 0, 0]}>
                {sellThrough.map((r, i) => (
                  <Cell key={i} fill={selectedDivision === r.division ? CHART_COLORS[0] : 'var(--border)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card
        title={`Non-Movers — ${monthLabel(selectedMonth)}${selectedDivision ? ` — ${selectedDivision}` : ''}`}
        subtitle={`Articles with zero units sold in ${monthLabel(selectedMonth)} but positive closing stock. Top 50 by stock value.`}
      >
        {loadingNonMovers ? (
          <SkeletonTable />
        ) : (
          <DataGrid
            rowData={nonMovers}
            columnDefs={nonMoverColumns}
            fileName={`non-movers-${selectedMonth}${selectedDivision ? `-${selectedDivision}` : ''}`}
            emptyMessage="No non-moving stock found for the selected scope."
          />
        )}
      </Card>

      <Card
        title={`Repeat-Order Candidates — ${monthLabel(selectedMonth)}${selectedDivision ? ` — ${selectedDivision}` : ''}`}
        subtitle={`Signal only, not an auto-reorder quantity. Heuristic: articles selling ${FAST_SELLER_MIN_UNITS}+ units in the month with fewer than ${LOW_COVER_MAX_DAYS} days of stock cover at the current sell rate (closing qty ÷ average daily units sold). Review before placing any purchase order.`}
      >
        {loadingRepeat ? (
          <SkeletonTable />
        ) : (
          <DataGrid
            rowData={repeatCandidates}
            columnDefs={repeatCandidateColumns}
            fileName={`repeat-order-candidates-${selectedMonth}${selectedDivision ? `-${selectedDivision}` : ''}`}
            pagination={false}
            emptyMessage="No fast-selling, low-cover articles found for the selected scope."
          />
        )}
      </Card>
    </div>
  );
}

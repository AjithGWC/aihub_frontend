import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import type { ColDef } from 'ag-grid-community';
import { useDashboardTiles } from '../hooks/useDashboardTiles';
import {
  Row,
  n,
  s,
  inr,
  formatCompact,
  heatStyle,
  CHART_COLORS,
  NEGATIVE,
  POSITIVE,
  tooltipStyle,
  legendStyle,
  selectStyle,
  filterLabelStyle,
  Card,
  DataGrid,
  Skeleton,
  SkeletonChart,
  SkeletonTable,
} from './_shared/dashboardKit';

// Store filtering (warehouse 1070 excluded — not a P&L "store") now happens in the tile manifest SQL.

function monthKey(d: unknown): string {
  return String(d).slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function gmroi(gp: number, opening: number, closing: number): number | null {
  const avgInv = (opening + closing) / 2;
  if (avgInv === 0) return null;
  return gp / avgInv;
}

interface StoreMonthRow {
  siteName: string;
  month: string;
  revenue: number;
  cogs: number;
  gp: number;
  openingAmt: number;
  closingAmt: number;
}
interface DivisionMonthRow {
  division: string;
  month: string;
  revenue: number;
  gp: number;
  openingAmt: number;
  closingAmt: number;
  discount: number;
  promo: number;
  markdownRows: number;
  totalRows: number;
}
interface StoreProfitRow extends Row {
  siteName: string;
  revenue: number;
  cogs: number;
  gp: number;
  marginPct: number;
}
interface MarkdownRow extends Row {
  division: string;
  revenue: number;
  marginPct: number;
  discount: number;
  promo: number;
  discountPct: number;
  promoPct: number;
  coveragePct: number;
}

export default function FinanceMargin() {
  // Data arrives per tile over an NDJSON stream — no SQL in the frontend.
  // Rollup measures are already sign-corrected (revenue/cogs/units positive).
  const { tiles, status, errors, fatalError } = useDashboardTiles('finance-margin');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Each section shows its own skeleton until its tile lands.
  const loading = status['store-month'] !== 'ready' && status['store-month'] !== 'error';
  const loadingDiv = status['division-month'] !== 'ready' && status['division-month'] !== 'error';
  const error = errors['store-month'] || errors['division-month'] || null;

  const storeMonthRows: StoreMonthRow[] = useMemo(
    () =>
      ((tiles['store-month']?.rows ?? []) as Row[]).map((r) => ({
        siteName: s(r.site_name),
        month: monthKey(r.start_date),
        revenue: n(r.revenue),
        cogs: n(r.cogs),
        gp: n(r.gp),
        openingAmt: n(r.opening_amt),
        closingAmt: n(r.closing_amt),
      })),
    [tiles]
  );

  const divisionMonthRows: DivisionMonthRow[] = useMemo(
    () =>
      ((tiles['division-month']?.rows ?? []) as Row[]).map((r) => ({
        division: s(r.division),
        month: monthKey(r.start_date),
        revenue: n(r.revenue),
        gp: n(r.gp),
        openingAmt: n(r.opening_amt),
        closingAmt: n(r.closing_amt),
        discount: n(r.discount),
        promo: n(r.promo),
        markdownRows: n(r.n_markdown_rows),
        totalRows: n(r.n_rows),
      })),
    [tiles]
  );

  const months = useMemo(() => Array.from(new Set(storeMonthRows.map((r) => r.month))).sort(), [storeMonthRows]);

  // Default to the latest month once the first tile arrives.
  useEffect(() => {
    if (!selectedMonth && months.length > 0) setSelectedMonth(months[months.length - 1]);
  }, [months, selectedMonth]);

  const gmroiByStore = useMemo(
    () =>
      storeMonthRows
        .filter((r) => r.month === selectedMonth)
        .map((r) => ({ siteName: r.siteName, gmroi: gmroi(r.gp, r.openingAmt, r.closingAmt) }))
        .filter((r) => r.gmroi != null)
        .sort((a, b) => (b.gmroi as number) - (a.gmroi as number)),
    [storeMonthRows, selectedMonth]
  );

  const gmroiByDivision = useMemo(
    () =>
      divisionMonthRows
        .filter((r) => r.month === selectedMonth && r.revenue !== 0)
        .map((r) => ({ division: r.division, gmroi: gmroi(r.gp, r.openingAmt, r.closingAmt) }))
        .filter((r) => r.gmroi != null)
        .sort((a, b) => (b.gmroi as number) - (a.gmroi as number)),
    [divisionMonthRows, selectedMonth]
  );

  const storeProfitability: StoreProfitRow[] = useMemo(
    () =>
      storeMonthRows
        .filter((r) => r.month === selectedMonth)
        .map((r) => ({ ...r, marginPct: r.revenue !== 0 ? (r.gp / r.revenue) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue),
    [storeMonthRows, selectedMonth]
  );

  const markdownImpact: MarkdownRow[] = useMemo(
    () =>
      divisionMonthRows
        .filter((r) => r.month === selectedMonth && r.revenue !== 0)
        .map((r) => ({
          ...r,
          marginPct: (r.gp / r.revenue) * 100,
          discountPct: (r.discount / r.revenue) * 100,
          promoPct: (r.promo / r.revenue) * 100,
          coveragePct: r.totalRows > 0 ? (r.markdownRows / r.totalRows) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    [divisionMonthRows, selectedMonth]
  );

  const marginTrend = useMemo(() => {
    const storeNames = Array.from(new Set(storeMonthRows.map((r) => r.siteName)));
    const byMonth = new Map<string, Record<string, unknown>>();
    for (const r of storeMonthRows) {
      const point = byMonth.get(r.month) ?? { month: r.month };
      point[r.siteName] = r.revenue !== 0 ? (r.gp / r.revenue) * 100 : 0;
      byMonth.set(r.month, point);
    }
    return { storeNames, points: Array.from(byMonth.values()).sort((a, b) => (a.month as string).localeCompare(b.month as string)) };
  }, [storeMonthRows]);

  const overallMarkdownCoverage = useMemo(() => {
    const rows = divisionMonthRows.filter((r) => r.month === selectedMonth);
    const totalRows = rows.reduce((acc, r) => acc + r.totalRows, 0);
    const markdownRows = rows.reduce((acc, r) => acc + r.markdownRows, 0);
    return totalRows > 0 ? (markdownRows / totalRows) * 100 : 0;
  }, [divisionMonthRows, selectedMonth]);

  const storeProfitabilityColumns: ColDef<StoreProfitRow>[] = useMemo(() => {
    const maxRevenue = Math.max(1, ...storeProfitability.map((r) => r.revenue));
    const maxCogs = Math.max(1, ...storeProfitability.map((r) => r.cogs));
    const maxGp = Math.max(1, ...storeProfitability.map((r) => r.gp));
    return [
      { field: 'siteName', headerName: 'Store' },
      {
        field: 'revenue',
        headerName: 'Revenue',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxRevenue),
      },
      {
        field: 'cogs',
        headerName: 'COGS',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxCogs),
      },
      {
        field: 'gp',
        headerName: 'Gross Profit',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxGp),
      },
      { field: 'marginPct', headerName: 'Margin %', valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%` },
    ];
  }, [storeProfitability]);

  const markdownImpactColumns: ColDef<MarkdownRow>[] = useMemo(() => {
    const maxRevenue = Math.max(1, ...markdownImpact.map((r) => r.revenue));
    return [
      { field: 'division', headerName: 'Division' },
      {
        field: 'revenue',
        headerName: 'Revenue',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxRevenue),
      },
      { field: 'marginPct', headerName: 'Margin %', valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%` },
      { field: 'discount', headerName: 'Discount', valueFormatter: (p) => inr.format(p.value ?? 0) },
      { field: 'promo', headerName: 'Promo', valueFormatter: (p) => inr.format(p.value ?? 0) },
      {
        headerName: 'Discount % of Rev',
        valueGetter: (p) => (p.data ? p.data.discountPct + p.data.promoPct : 0),
        valueFormatter: (p) => `${(p.value ?? 0).toFixed(2)}%`,
      },
      {
        field: 'coveragePct',
        headerName: 'Line Coverage',
        valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}% of lines`,
        cellStyle: () => ({ color: 'var(--muted)' }),
      },
    ];
  }, [markdownImpact]);

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

      <div className="chart-grid">
        <Card
          title={`GMROI by Store${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`}
          subtitle="GMROI = monthly gross profit ÷ average inventory value (this is a monthly figure, not annualized — values naturally sit well under 1.0). Red bars are below the 1.0 flag threshold."
        >
          {loading ? (
            <SkeletonChart height={260} />
          ) : gmroiByStore.length === 0 ? (
            <div className="muted">No GMROI data for the selected month.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gmroiByStore} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="siteName" interval={0} />
                <YAxis tickFormatter={(v: number) => v.toFixed(2)} width={50} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => v.toFixed(2)} />
                <ReferenceLine y={1} strokeDasharray="4 4" label={{ value: '1.0', position: 'right', fill: 'var(--muted)', fontSize: 12 }} />
                <Bar dataKey="gmroi" name="GMROI" radius={[4, 4, 0, 0]}>
                  {gmroiByStore.map((r, i) => (
                    <Cell key={i} fill={(r.gmroi as number) < 1 ? NEGATIVE : POSITIVE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card
          title={`GMROI by Division${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`}
          subtitle="Same monthly GMROI formula, grouped by division."
        >
          {loadingDiv ? (
            <SkeletonChart height={260} />
          ) : gmroiByDivision.length === 0 ? (
            <div className="muted">No GMROI data for the selected month.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gmroiByDivision} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="division" angle={-30} textAnchor="end" interval={0} height={80} />
                <YAxis tickFormatter={(v: number) => v.toFixed(2)} width={50} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => v.toFixed(2)} />
                <ReferenceLine y={1} strokeDasharray="4 4" label={{ value: '1.0', position: 'right', fill: 'var(--muted)', fontSize: 12 }} />
                <Bar dataKey="gmroi" name="GMROI" radius={[4, 4, 0, 0]}>
                  {gmroiByDivision.map((r, i) => (
                    <Cell key={i} fill={(r.gmroi as number) < 1 ? NEGATIVE : POSITIVE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card
        title={`Gross Store Profitability${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`}
        subtitle="Gross profitability only — revenue minus COGS. Net profitability would require operating expenses (rent, staff, utilities, etc.), which are not available in this dataset."
      >
        {loading ? (
          <SkeletonChart height={280} />
        ) : storeProfitability.length === 0 ? (
          <div className="muted">No data for the selected month.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={storeProfitability} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="siteName" interval={0} />
              <YAxis tickFormatter={(v: number) => formatCompact(v)} width={80} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => formatCompact(v)} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="revenue" name="Revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="cogs" name="COGS" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="gp" name="Gross Profit" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={storeProfitability}
              columnDefs={storeProfitabilityColumns}
              fileName={`gross-store-profitability-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, storeProfitability.length * 42 + 56)}
              emptyMessage="No data for the selected month."
            />
          )}
        </div>
      </Card>

      <Card
        title={`Markdown / Discount Impact${selectedMonth ? ` — ${monthLabel(selectedMonth)}` : ''}`}
        subtitle={`Coverage is sparse — only ${overallMarkdownCoverage.toFixed(1)}% of line items in this scope carry a non-zero discount or promo amount, so treat these figures as indicative, not a comprehensive markdown analysis.`}
      >
        {loadingDiv ? (
          <SkeletonTable />
        ) : (
          <DataGrid
            rowData={markdownImpact}
            columnDefs={markdownImpactColumns}
            fileName={`markdown-discount-impact-${selectedMonth}`}
            pagination={false}
            height={Math.max(160, markdownImpact.length * 42 + 56)}
            emptyMessage="No markdown data for the selected month."
          />
        )}
      </Card>

      <Card title="Margin Trend by Store — Apr → Jun">
        {loading ? (
          <SkeletonChart height={320} />
        ) : marginTrend.points.length === 0 ? (
          <div className="muted">No trend data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={marginTrend.points} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={monthLabel} />
              <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={50} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--muted)' }}
                labelFormatter={monthLabel}
                formatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <Legend wrapperStyle={legendStyle} />
              {marginTrend.storeNames.map((name, i) => (
                <Line key={name} type="monotone" dataKey={name} name={name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

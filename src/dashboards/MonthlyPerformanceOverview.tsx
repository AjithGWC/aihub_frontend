import { useEffect, useMemo, useState, CSSProperties } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useDashboardTiles } from '../hooks/useDashboardTiles';

type Row = Record<string, unknown>;

const PALETTE = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#a855f7', '#ec4899', '#84cc16'];
const GREEN = '#10b981';
const RED = '#ef4444';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN');

const tooltipStyle = {
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
};
const legendStyle = { color: 'var(--muted)', fontSize: 13 };
const selectStyle: CSSProperties = {
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  color: 'var(--text)',
  fontSize: 13,
  minWidth: 160,
};
const filterLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  color: 'var(--muted)',
};

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown, fallback = 'Unknown') => (v == null ? fallback : String(v));

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function deltaColor(pct: number | null): string {
  if (pct == null) return 'var(--muted)';
  return pct >= 0 ? GREEN : RED;
}
function formatPct(pct: number | null): string {
  if (pct == null) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
function pctChange(cur: number, prior: number | null): number | null {
  if (prior == null || prior === 0) return null;
  return ((cur - prior) / prior) * 100;
}
function tooltipFormatter(value: number, name: string): [string, string] {
  return name === 'Orders' || name === 'Units' ? [num.format(value), name] : [inr.format(value), name];
}
function payloadOf(d: any): any {
  return d?.payload ?? d;
}

interface MonthPoint {
  month: string;
  revenue: number;
  orders: number;
  units: number;
}
interface RegionRow {
  region: string;
  revenue: number;
  orders: number;
}
interface BranchRow {
  branchId: number;
  branch: string;
  region: string;
  revenue: number;
  orders: number;
}
interface NameRevenueRow {
  name: string;
  revenue: number;
}
interface PaymentRow {
  name: string;
  revenue: number;
  orders: number;
}
interface DailyRow {
  day: string;
  revenue: number;
  orders: number;
}
interface ProductRow {
  product: string;
  brand: string;
  units: number;
  revenue: number;
}
interface InventoryByBranch {
  branch: string;
  stock: number;
  lowStock: number;
}
interface NameStockRow {
  name: string;
  stock: number;
}
interface LowStockRow {
  product: string;
  branch: string;
  quantity: number;
  reorderLevel: number;
}

function Sparkline({ id, data, color }: { id: string; data: { value: number }[]; color: string }) {
  if (data.length < 2) {
    return <div style={{ height: 40 }} />;
  }
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function MonthlyPerformanceOverview() {
  // Data arrives per tile over an NDJSON stream — no SQL in the frontend. Every
  // tile is paramless and carries the whole month-keyed history, so changing the
  // month or drilling down never triggers a new query.
  const { tiles, status, errors, fatalError } = useDashboardTiles('monthly-performance-overview');

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<{ id: number; name: string } | null>(null);

  const isReady = (id: string) => status[id] === 'ready' || status[id] === 'error';
  const loadingMonth = !(
    isReady('region-month') &&
    isReady('branch-month') &&
    isReady('category-month') &&
    isReady('payment-month') &&
    isReady('daily-revenue')
  );
  const loadingProducts = !isReady('product-month-branch');
  const error =
    errors['monthly-revenue'] ||
    errors['monthly-units'] ||
    errors['region-month'] ||
    errors['branch-month'] ||
    errors['category-month'] ||
    errors['payment-month'] ||
    errors['daily-revenue'] ||
    errors['product-month-branch'] ||
    errors['inv-totals'] ||
    errors['inv-by-branch'] ||
    errors['inv-by-category'] ||
    errors['low-stock'] ||
    null;

  // Full monthly history — drives the month filter and the KPI trends.
  const monthly: MonthPoint[] = useMemo(() => {
    const unitsByMonth = new Map<string, number>(
      ((tiles['monthly-units']?.rows ?? []) as Row[]).map((r) => [s(r.month), n(r.units)])
    );
    return ((tiles['monthly-revenue']?.rows ?? []) as Row[]).map((r) => {
      const month = s(r.month);
      return { month, revenue: n(r.revenue), orders: n(r.orders), units: unitsByMonth.get(month) ?? 0 };
    });
  }, [tiles]);

  const months = useMemo(() => monthly.map((m) => m.month), [monthly]);

  // Default to the latest month once the monthly tile lands.
  useEffect(() => {
    if (!selectedMonth && months.length > 0) setSelectedMonth(months[months.length - 1]);
  }, [months, selectedMonth]);

  // The month selector used to re-query; it now filters already-loaded rows.
  // Each tile is ordered by month then revenue DESC, so the per-month slice keeps
  // exactly the ordering the old per-month queries produced.
  const regionData: RegionRow[] = useMemo(
    () =>
      ((tiles['region-month']?.rows ?? []) as Row[])
        .filter((r) => s(r.month) === selectedMonth)
        .map((r) => ({ region: s(r.region), revenue: n(r.revenue), orders: n(r.orders) })),
    [tiles, selectedMonth]
  );

  const branchData: BranchRow[] = useMemo(
    () =>
      ((tiles['branch-month']?.rows ?? []) as Row[])
        .filter((r) => s(r.month) === selectedMonth)
        .map((r) => ({
          branchId: n(r.branch_id),
          branch: s(r.branch_name),
          region: s(r.region),
          revenue: n(r.revenue),
          orders: n(r.orders),
        })),
    [tiles, selectedMonth]
  );

  const categoryData: NameRevenueRow[] = useMemo(
    () =>
      ((tiles['category-month']?.rows ?? []) as Row[])
        .filter((r) => s(r.month) === selectedMonth)
        .map((r) => ({ name: s(r.category), revenue: n(r.revenue) })),
    [tiles, selectedMonth]
  );

  const paymentData: PaymentRow[] = useMemo(
    () =>
      ((tiles['payment-month']?.rows ?? []) as Row[])
        .filter((r) => s(r.month) === selectedMonth)
        .map((r) => ({ name: s(r.payment_method), revenue: n(r.revenue), orders: n(r.orders) })),
    [tiles, selectedMonth]
  );

  const dailyData: DailyRow[] = useMemo(
    () =>
      ((tiles['daily-revenue']?.rows ?? []) as Row[])
        .filter((r) => s(r.month) === selectedMonth)
        .map((r) => ({ day: s(r.day), revenue: n(r.revenue), orders: n(r.orders) })),
    [tiles, selectedMonth]
  );

  // Drilldown level 2: top products for the selected store, in the selected
  // month. The tile carries every month x store row (ordered revenue DESC within
  // each), so the old on-demand query becomes a filter plus a top-10 slice.
  const topProducts: ProductRow[] = useMemo(() => {
    if (!selectedBranch || !selectedMonth) return [];
    return ((tiles['product-month-branch']?.rows ?? []) as Row[])
      .filter((r) => s(r.month) === selectedMonth && n(r.branch_id) === selectedBranch.id)
      .slice(0, 10)
      .map((r) => ({
        product: s(r.product),
        brand: s(r.brand),
        units: n(r.units),
        revenue: n(r.revenue),
      }));
  }, [tiles, selectedMonth, selectedBranch]);

  // Inventory has no date column, so these tiles are a live snapshot and are
  // never filtered by month.
  const invTotals = useMemo(() => {
    const invTotalRow = (tiles['inv-totals']?.rows ?? [])[0] as Row | undefined;
    return { stock: n(invTotalRow?.total_stock), lowStockCount: n(invTotalRow?.low_stock_count) };
  }, [tiles]);

  const invByBranch: InventoryByBranch[] = useMemo(
    () =>
      ((tiles['inv-by-branch']?.rows ?? []) as Row[]).map((r) => ({
        branch: s(r.branch),
        stock: n(r.stock),
        lowStock: n(r.low_stock),
      })),
    [tiles]
  );

  const invByCategory: NameStockRow[] = useMemo(
    () => ((tiles['inv-by-category']?.rows ?? []) as Row[]).map((r) => ({ name: s(r.category), stock: n(r.stock) })),
    [tiles]
  );

  const lowStockItems: LowStockRow[] = useMemo(
    () =>
      ((tiles['low-stock']?.rows ?? []) as Row[]).map((r) => ({
        product: s(r.product),
        branch: s(r.branch),
        quantity: n(r.quantity),
        reorderLevel: n(r.reorder_level),
      })),
    [tiles]
  );

  // Nothing can render until the month list exists and a month is selected.
  const loadingInit = !isReady('monthly-revenue') || (months.length > 0 && !selectedMonth);

  function handleMonthChange(month: string) {
    setSelectedMonth(month);
    setSelectedRegion(null);
    setSelectedBranch(null);
  }

  const kpis = useMemo(() => {
    const idx = monthly.findIndex((m) => m.month === selectedMonth);
    if (idx < 0) return null;
    const cur = monthly[idx];
    const prior = idx > 0 ? monthly[idx - 1] : null;
    const spark = monthly.slice(Math.max(0, idx - 5), idx + 1);
    return {
      revenue: cur.revenue,
      orders: cur.orders,
      units: cur.units,
      revenuePct: pctChange(cur.revenue, prior?.revenue ?? null),
      ordersPct: pctChange(cur.orders, prior?.orders ?? null),
      unitsPct: pctChange(cur.units, prior?.units ?? null),
      priorLabel: prior ? monthLabel(prior.month) : null,
      revenueSpark: spark.map((m) => ({ value: m.revenue })),
      ordersSpark: spark.map((m) => ({ value: m.orders })),
      unitsSpark: spark.map((m) => ({ value: m.units })),
    };
  }, [monthly, selectedMonth]);

  const filteredBranchData = useMemo(
    () => (selectedRegion ? branchData.filter((b) => b.region === selectedRegion) : branchData),
    [branchData, selectedRegion]
  );

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }
  if (loadingInit) {
    return <p className="muted">Loading dashboard…</p>;
  }
  if (error && months.length === 0) {
    return <div className="error-box">Failed to load dashboard data: {error}</div>;
  }
  if (months.length === 0) {
    return <p className="muted">No sales data available yet.</p>;
  }

  const revenueColor = deltaColor(kpis?.revenuePct ?? null);
  const ordersColor = deltaColor(kpis?.ordersPct ?? null);
  const unitsColor = deltaColor(kpis?.unitsPct ?? null);
  const invColor = invTotals.lowStockCount > 0 ? RED : GREEN;

  return (
    <div>
      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={filterLabelStyle}>
          Month
          <select style={selectStyle} value={selectedMonth} onChange={(e) => handleMonthChange(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        {loadingMonth && <p className="muted small" style={{ margin: 0 }}>Updating…</p>}
        {(selectedRegion || selectedBranch) && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto', fontSize: 13, flexWrap: 'wrap' }}>
            <span className="muted">Drilldown:</span>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSelectedRegion(null);
                setSelectedBranch(null);
              }}
            >
              All Regions
            </button>
            {selectedRegion && <span className="muted">›</span>}
            {selectedRegion && (
              <button className="btn btn-ghost" onClick={() => setSelectedBranch(null)}>
                {selectedRegion}
              </button>
            )}
            {selectedBranch && <span className="muted">›</span>}
            {selectedBranch && <span>{selectedBranch.name}</span>}
          </div>
        )}
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Revenue — {monthLabel(selectedMonth)}</div>
          <div className="kpi-value">{inr.format(kpis?.revenue ?? 0)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: revenueColor, fontSize: 13, fontWeight: 600 }}>{formatPct(kpis?.revenuePct ?? null)}</span>
            <span className="muted small">vs {kpis?.priorLabel ?? 'prior month'}</span>
          </div>
          <Sparkline id="revenue" data={kpis?.revenueSpark ?? []} color={revenueColor} />
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sales Orders — {monthLabel(selectedMonth)}</div>
          <div className="kpi-value">{num.format(kpis?.orders ?? 0)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: ordersColor, fontSize: 13, fontWeight: 600 }}>{formatPct(kpis?.ordersPct ?? null)}</span>
            <span className="muted small">vs {kpis?.priorLabel ?? 'prior month'}</span>
          </div>
          <Sparkline id="orders" data={kpis?.ordersSpark ?? []} color={ordersColor} />
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Units Sold — {monthLabel(selectedMonth)}</div>
          <div className="kpi-value">{num.format(kpis?.units ?? 0)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: unitsColor, fontSize: 13, fontWeight: 600 }}>{formatPct(kpis?.unitsPct ?? null)}</span>
            <span className="muted small">vs {kpis?.priorLabel ?? 'prior month'}</span>
          </div>
          <Sparkline id="units" data={kpis?.unitsSpark ?? []} color={unitsColor} />
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Inventory Stock (Live)</div>
          <div className="kpi-value">{num.format(invTotals.stock)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: invColor, fontSize: 13, fontWeight: 600 }}>
              {invTotals.lowStockCount > 0 ? `${num.format(invTotals.lowStockCount)} low stock` : 'All healthy'}
            </span>
          </div>
          <p className="muted small" style={{ margin: '6px 0 0' }}>
            Live snapshot — inventory isn&apos;t tracked historically, so no month-over-month trend is available.
          </p>
        </div>
      </div>

      <div className="chart-card">
        <h3>Revenue &amp; Orders — Monthly Trend</h3>
        <p className="muted small" style={{ marginTop: -10 }}>Click a bar to change the selected month.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthly} margin={{ bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tickFormatter={monthLabel} stroke="var(--muted)" />
            <YAxis yAxisId="left" stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--muted)" tickFormatter={(v: number) => num.format(v)} width={70} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={monthLabel} formatter={tooltipFormatter} />
            <Legend wrapperStyle={legendStyle} />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue" cursor="pointer" onClick={(d: any) => handleMonthChange(payloadOf(d).month)}>
              {monthly.map((m, i) => (
                <Cell key={i} fill={m.month === selectedMonth ? PALETTE[0] : 'var(--border)'} />
              ))}
            </Bar>
            <Bar yAxisId="right" dataKey="orders" name="Orders" fill={PALETTE[1]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => handleMonthChange(payloadOf(d).month)} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Daily Revenue — {monthLabel(selectedMonth)}</h3>
        {dailyData.length === 0 ? (
          <p className="muted">No orders for this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted)" tickFormatter={(d: string) => d.slice(8, 10)} />
              <YAxis stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
              <Line type="monotone" dataKey="revenue" stroke={PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Region-wise Sales — {monthLabel(selectedMonth)}</h3>
        <p className="muted small" style={{ marginTop: -10 }}>Click a bar to drill down into its stores.</p>
        {regionData.length === 0 ? (
          <p className="muted">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="region" stroke="var(--muted)" />
              <YAxis yAxisId="left" stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--muted)" tickFormatter={(v: number) => num.format(v)} width={70} />
              <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
              <Legend wrapperStyle={legendStyle} />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" cursor="pointer" onClick={(d: any) => setSelectedRegion(payloadOf(d).region)} radius={[4, 4, 0, 0]}>
                {regionData.map((d, i) => (
                  <Cell key={i} fill={selectedRegion === d.region ? PALETTE[0] : PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
              <Bar yAxisId="right" dataKey="orders" name="Orders" fill={PALETTE[1]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => setSelectedRegion(payloadOf(d).region)} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>
          Store-wise Sales — {monthLabel(selectedMonth)}
          {selectedRegion ? ` — ${selectedRegion}` : ''}
        </h3>
        <p className="muted small" style={{ marginTop: -10 }}>Click a bar to see that store&apos;s top products.</p>
        {filteredBranchData.length === 0 ? (
          <p className="muted">No data available for the selected filters.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, Math.min(filteredBranchData.length, 15) * 34)}>
            <BarChart data={filteredBranchData} layout="vertical" margin={{ left: 110 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} />
              <YAxis type="category" dataKey="branch" stroke="var(--muted)" width={140} />
              <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter} />
              <Legend wrapperStyle={legendStyle} />
              <Bar
                dataKey="revenue"
                name="Revenue"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(d: any) => {
                  const p = payloadOf(d);
                  setSelectedBranch({ id: p.branchId, name: p.branch });
                }}
              >
                {filteredBranchData.map((d, i) => (
                  <Cell key={i} fill={selectedBranch?.id === d.branchId ? PALETTE[0] : PALETTE[2]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Top Products{selectedBranch ? ` — ${selectedBranch.name}` : ''}</h3>
        {!selectedBranch ? (
          <p className="muted">Click a store bar above to see its top products for {monthLabel(selectedMonth)}.</p>
        ) : loadingProducts ? (
          <p className="muted small">Loading…</p>
        ) : topProducts.length === 0 ? (
          <p className="muted">No product sales for this store in {monthLabel(selectedMonth)}.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>{p.product}</td>
                    <td>{p.brand}</td>
                    <td>{num.format(p.units)}</td>
                    <td>{inr.format(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Category-wise Revenue — {monthLabel(selectedMonth)}</h3>
          {categoryData.length === 0 ? (
            <p className="muted">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
                <Bar dataKey="revenue" fill={PALETTE[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Payment Method Split — {monthLabel(selectedMonth)}</h3>
          {paymentData.length === 0 ? (
            <p className="muted">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={paymentData} dataKey="revenue" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {paymentData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[(i + 3) % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
                <Legend wrapperStyle={legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Inventory by Category (Live)</h3>
          {invByCategory.length === 0 ? (
            <p className="muted">No inventory data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={invByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" tickFormatter={(v: number) => num.format(v)} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [num.format(v), 'Stock']} />
                <Bar dataKey="stock" name="Stock" fill={PALETTE[4]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Inventory by Store (Live)</h3>
          {invByBranch.length === 0 ? (
            <p className="muted">No inventory data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={invByBranch}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="branch" stroke="var(--muted)" angle={-20} textAnchor="end" interval={0} />
                <YAxis stroke="var(--muted)" tickFormatter={(v: number) => num.format(v)} width={70} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [num.format(v), 'Stock']} />
                <Bar dataKey="stock" fill={PALETTE[5]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h3>Low Stock Alerts (Live)</h3>
        {lowStockItems.length === 0 ? (
          <p className="muted">No items are at or below their reorder level.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Store</th>
                  <th>Quantity</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((r, i) => (
                  <tr key={i}>
                    <td>{r.product}</td>
                    <td>{r.branch}</td>
                    <td style={{ color: RED }}>{num.format(r.quantity)}</td>
                    <td>{num.format(r.reorderLevel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

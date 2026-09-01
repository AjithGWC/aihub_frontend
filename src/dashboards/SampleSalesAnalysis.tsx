import { useMemo, useState, CSSProperties } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useDashboardTiles } from '../hooks/useDashboardTiles';

type Row = Record<string, unknown>;
type CompareMode = 'mom' | 'wow' | 'yoy';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#06b6d4', '#a855f7', '#ec4899', '#ef4444', '#84cc16'];
const GREEN = '#22c55e';

const MONTHS = [
  '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01',
  '2024-07-01', '2024-08-01', '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01',
  '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01',
];

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
const segmentWrapStyle: CSSProperties = {
  display: 'flex',
  gap: 2,
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: 2,
};
function segmentBtnStyle(active: boolean): CSSProperties {
  return {
    padding: '7px 14px',
    fontSize: 13,
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? '#fff' : 'var(--text)',
  };
}

const n = (v: unknown): number => Number(v) || 0;
const s = (v: unknown, fallback = 'Unknown'): string => (v == null ? fallback : String(v));

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function monthShort(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
}
function weekLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pctChange(cur: number, prior: number | null): number | null {
  if (prior == null || prior === 0) return null;
  return ((cur - prior) / prior) * 100;
}
function formatPct(pct: number | null): string {
  if (pct == null) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
function deltaColor(pct: number | null): string {
  if (pct == null) return 'var(--muted)';
  return pct >= 0 ? GREEN : 'var(--danger)';
}

interface MonthPoint {
  month: string;
  revenue: number;
  orders: number;
}
interface WeekPoint {
  week: string;
  revenue: number;
  orders: number;
}
interface YoyPoint {
  monthNum: number;
  currentYear: number;
  priorYear: number;
}
interface CategoryRow {
  category: string;
  revenue: number;
}
interface BranchRow {
  branch: string;
  city: string;
  orders: number;
  revenue: number;
}

export default function SampleSalesAnalysis() {
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[MONTHS.length - 1]);
  const [compareMode, setCompareMode] = useState<CompareMode>('mom');

  const { tiles, status, errors, fatalError } = useDashboardTiles('sample-sales-analysis', {
    month: selectedMonth,
  });

  const isReady = (id: string) => status[id] === 'ready';
  const isError = (id: string) => status[id] === 'error';
  const isLoading = (id: string) => status[id] === 'loading' || status[id] === undefined;

  const kpi = useMemo(() => {
    const row = (tiles['kpi-summary']?.rows ?? [])[0] as Row | undefined;
    if (!row) return null;
    return {
      revenue: n(row.revenue),
      orders: n(row.orders),
      priorMonthRevenue: n(row.prior_month_revenue),
      priorMonthOrders: n(row.prior_month_orders),
      priorYearRevenue: n(row.prior_year_revenue),
      priorYearOrders: n(row.prior_year_orders),
    };
  }, [tiles]);

  const monthlyTrend: MonthPoint[] = useMemo(
    () =>
      ((tiles['monthly-trend']?.rows ?? []) as Row[]).map((r) => ({
        month: s(r.month),
        revenue: n(r.revenue),
        orders: n(r.orders),
      })),
    [tiles]
  );

  const weeklyTrend: WeekPoint[] = useMemo(
    () =>
      ((tiles['weekly-trend']?.rows ?? []) as Row[]).map((r) => ({
        week: s(r.week_start),
        revenue: n(r.revenue),
        orders: n(r.orders),
      })),
    [tiles]
  );

  const yoyComparison: YoyPoint[] = useMemo(
    () =>
      ((tiles['yoy-comparison']?.rows ?? []) as Row[]).map((r) => ({
        monthNum: n(r.month_num),
        currentYear: n(r.current_year_revenue),
        priorYear: n(r.prior_year_revenue),
      })),
    [tiles]
  );

  const categoryBreakdown: CategoryRow[] = useMemo(
    () =>
      ((tiles['category-breakdown']?.rows ?? []) as Row[]).map((r) => ({
        category: s(r.category),
        revenue: n(r.revenue),
      })),
    [tiles]
  );

  const topBranches: BranchRow[] = useMemo(
    () =>
      ((tiles['top-branches']?.rows ?? []) as Row[]).map((r) => ({
        branch: s(r.branch),
        city: s(r.city),
        orders: n(r.orders),
        revenue: n(r.revenue),
      })),
    [tiles]
  );

  const aov = kpi && kpi.orders > 0 ? kpi.revenue / kpi.orders : 0;

  const momRevenuePct = kpi ? pctChange(kpi.revenue, kpi.priorMonthRevenue || null) : null;
  const momOrdersPct = kpi ? pctChange(kpi.orders, kpi.priorMonthOrders || null) : null;
  const yoyRevenuePct = kpi ? pctChange(kpi.revenue, kpi.priorYearRevenue || null) : null;
  const yoyOrdersPct = kpi ? pctChange(kpi.orders, kpi.priorYearOrders || null) : null;

  const lastTwoWeeks = weeklyTrend.slice(-2);
  const wowRevenuePct =
    lastTwoWeeks.length === 2 ? pctChange(lastTwoWeeks[1].revenue, lastTwoWeeks[0].revenue || null) : null;
  const wowOrdersPct =
    lastTwoWeeks.length === 2 ? pctChange(lastTwoWeeks[1].orders, lastTwoWeeks[0].orders || null) : null;

  const compareLabels: Record<CompareMode, string> = {
    mom: 'vs last month',
    wow: 'vs prior week',
    yoy: 'vs same month last year',
  };
  const revenueDeltaByMode: Record<CompareMode, number | null> = {
    mom: momRevenuePct,
    wow: wowRevenuePct,
    yoy: yoyRevenuePct,
  };
  const ordersDeltaByMode: Record<CompareMode, number | null> = {
    mom: momOrdersPct,
    wow: wowOrdersPct,
    yoy: yoyOrdersPct,
  };
  const revenueDelta = revenueDeltaByMode[compareMode];
  const ordersDelta = ordersDeltaByMode[compareMode];

  const yoyChartData = yoyComparison.map((r) => ({
    month: MONTH_NAMES[r.monthNum - 1] ?? String(r.monthNum),
    'This period': r.currentYear,
    'Same month last year': r.priorYear,
  }));

  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }

  return (
    <div>
      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={filterLabelStyle}>
          Month
          <select style={selectStyle} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>

        <label style={filterLabelStyle}>
          Compare
          <div style={segmentWrapStyle}>
            {(['mom', 'wow', 'yoy'] as CompareMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                style={segmentBtnStyle(compareMode === mode)}
                onClick={() => setCompareMode(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Revenue — {monthLabel(selectedMonth)}</div>
          <div className="kpi-value">{kpi ? inr.format(kpi.revenue) : '—'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: deltaColor(revenueDelta), fontSize: 13, fontWeight: 600 }}>
              {formatPct(revenueDelta)}
            </span>
            <span className="muted small">{compareLabels[compareMode]}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Orders — {monthLabel(selectedMonth)}</div>
          <div className="kpi-value">{kpi ? num.format(kpi.orders) : '—'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ color: deltaColor(ordersDelta), fontSize: 13, fontWeight: 600 }}>
              {formatPct(ordersDelta)}
            </span>
            <span className="muted small">{compareLabels[compareMode]}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Order Value</div>
          <div className="kpi-value">{kpi ? inr.format(aov) : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">MoM Revenue Growth</div>
          <div className="kpi-value" style={{ color: deltaColor(momRevenuePct), fontSize: 22 }}>
            {formatPct(momRevenuePct)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">YoY Revenue Growth</div>
          <div className="kpi-value" style={{ color: deltaColor(yoyRevenuePct), fontSize: 22 }}>
            {formatPct(yoyRevenuePct)}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <h3>Monthly Revenue Trend (MoM) — trailing 13 months</h3>
        {isError('monthly-trend') && <div className="error-box">{errors['monthly-trend']}</div>}
        {isLoading('monthly-trend') && <p className="muted">Loading…</p>}
        {isReady('monthly-trend') &&
          (monthlyTrend.length === 0 ? (
            <p className="muted">No data for the selected period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyTrend} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={monthShort} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tickFormatter={(v: number) => inr.format(v)} width={90} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => num.format(v)} width={60} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={monthLabel}
                  formatter={(v: number, name: string) => (name === 'Orders' ? [num.format(v), name] : [inr.format(v), name])}
                />
                <Legend wrapperStyle={legendStyle} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]}>
                  {monthlyTrend.map((m, i) => (
                    <Cell key={i} fill={m.month === selectedMonth ? CHART_COLORS[0] : 'var(--border)'} />
                  ))}
                </Bar>
                <Bar yAxisId="right" dataKey="orders" name="Orders" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ))}
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Weekly Revenue Trend (WoW)</h3>
          {isError('weekly-trend') && <div className="error-box">{errors['weekly-trend']}</div>}
          {isLoading('weekly-trend') && <p className="muted">Loading…</p>}
          {isReady('weekly-trend') &&
            (weeklyTrend.length === 0 ? (
              <p className="muted">No data for the selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tickFormatter={weekLabel} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v: number) => inr.format(v)} width={90} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={weekLabel} formatter={(v: number) => inr.format(v)} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ))}
        </div>

        <div className="chart-card">
          <h3>Revenue by Category — {monthLabel(selectedMonth)}</h3>
          {isError('category-breakdown') && <div className="error-box">{errors['category-breakdown']}</div>}
          {isLoading('category-breakdown') && <p className="muted">Loading…</p>}
          {isReady('category-breakdown') &&
            (categoryBreakdown.length === 0 ? (
              <p className="muted">No data for the selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="revenue" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            ))}
        </div>
      </div>

      <div className="chart-card">
        <h3>Year-over-Year Monthly Comparison (YoY)</h3>
        {isError('yoy-comparison') && <div className="error-box">{errors['yoy-comparison']}</div>}
        {isLoading('yoy-comparison') && <p className="muted">Loading…</p>}
        {isReady('yoy-comparison') &&
          (yoyChartData.length === 0 ? (
            <p className="muted">No data for the selected period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yoyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v: number) => inr.format(v)} width={90} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="This period" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Same month last year" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ))}
      </div>

      <div className="chart-card">
        <h3>Top Branches — {monthLabel(selectedMonth)}</h3>
        {isError('top-branches') && <div className="error-box">{errors['top-branches']}</div>}
        {isLoading('top-branches') && <p className="muted">Loading…</p>}
        {isReady('top-branches') &&
          (topBranches.length === 0 ? (
            <p className="muted">No orders for the selected period.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>City</th>
                    <th>Orders</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topBranches.map((b, i) => (
                    <tr key={i}>
                      <td>{b.branch}</td>
                      <td>{b.city}</td>
                      <td>{num.format(b.orders)}</td>
                      <td>{inr.format(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
}

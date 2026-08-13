import { useMemo, useState, CSSProperties } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useDashboardTiles } from '../hooks/useDashboardTiles';

type Row = Record<string, unknown>;
type Granularity = 'week' | 'month' | 'year';

interface Filters {
  storeId: string;
  city: string;
  category: string;
  gender: string;
  payment: string;
}

interface FilterOptions {
  stores: { id: number; name: string }[];
  cities: string[];
  categories: string[];
  genders: string[];
  payments: string[];
}

interface DailyRow {
  day: string;
  revenue: number;
  orders: number;
}

interface StoreDailyRow extends DailyRow {
  branchId: number;
  branchName: string;
}

/**
 * One row of the pre-aggregated day x store x city x gender x payment grain that
 * the tile manifest returns. The filters that used to be pushed into a
 * dynamically-built WHERE clause are now applied to these rows client-side.
 */
interface GrainRow {
  day: string;
  branchId: number;
  branchName: string;
  city: string;
  gender: string;
  payment: string;
  category: string | null;
  revenue: number;
  orders: number;
}

interface SeriesPoint {
  key: string;
  label: string;
  current: number;
  prior: number | null;
  pctChange: number | null;
  orders: number;
}

interface StorePerfRow {
  branchId: number;
  name: string;
  current: number;
  prior: number | null;
  pct: number | null;
  orders: number;
}

interface GranularityConfig {
  bucket: 'week' | 'month';
  offset: number;
  shortLabel: string;
  label: string;
  compareLabel: string;
}

const GRANULARITY_CONFIG: Record<Granularity, GranularityConfig> = {
  week: { bucket: 'week', offset: 1, shortLabel: 'WoW', label: 'Week-over-Week', compareLabel: 'Prior Week' },
  month: { bucket: 'month', offset: 1, shortLabel: 'MoM', label: 'Month-over-Month', compareLabel: 'Prior Month' },
  year: {
    bucket: 'month',
    offset: 12,
    shortLabel: 'YoY',
    label: 'Year-over-Year',
    compareLabel: 'Same Month Last Year',
  },
};

const PALETTE = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#a855f7'];

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
const filterLabelStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--muted)' };

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown, fallback = '') => (v == null ? fallback : String(v));

function pad2(v: number) {
  return String(v).padStart(2, '0');
}
function toUTCDate(value: unknown): Date {
  return new Date(String(value));
}
function mondayOf(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
}
function weekKey(d: Date): string {
  const m = mondayOf(d);
  return `${m.getUTCFullYear()}-${pad2(m.getUTCMonth() + 1)}-${pad2(m.getUTCDate())}`;
}
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}
function weekLabel(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return `Wk of ${d.getUTCDate()} ${d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function buildWeekSpine(min: Date, max: Date): string[] {
  const keys: string[] = [];
  let cur = mondayOf(min);
  const end = mondayOf(max);
  while (cur.getTime() <= end.getTime()) {
    keys.push(weekKey(cur));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate() + 7));
  }
  return keys;
}
function buildMonthSpine(min: Date, max: Date): string[] {
  const keys: string[] = [];
  let cur = new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), 1));
  const end = new Date(Date.UTC(max.getUTCFullYear(), max.getUTCMonth(), 1));
  while (cur.getTime() <= end.getTime()) {
    keys.push(monthKey(cur));
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  return keys;
}
function bucketize(rows: DailyRow[], bucketFn: (d: Date) => string): Map<string, { revenue: number; orders: number }> {
  const map = new Map<string, { revenue: number; orders: number }>();
  for (const r of rows) {
    const key = bucketFn(toUTCDate(r.day));
    const cur = map.get(key) ?? { revenue: 0, orders: 0 };
    cur.revenue += r.revenue;
    cur.orders += r.orders;
    map.set(key, cur);
  }
  return map;
}
function buildSeries(
  spine: string[],
  bucketMap: Map<string, { revenue: number; orders: number }>,
  offset: number,
  labelFn: (k: string) => string
): SeriesPoint[] {
  return spine.map((key, i) => {
    const bucket = bucketMap.get(key);
    const current = bucket?.revenue ?? 0;
    const orders = bucket?.orders ?? 0;
    const priorIdx = i - offset;
    const priorKey = priorIdx >= 0 ? spine[priorIdx] : null;
    const prior = priorKey ? bucketMap.get(priorKey)?.revenue ?? 0 : null;
    const pctChange = prior != null && prior > 0 ? ((current - prior) / prior) * 100 : null;
    return { key, label: labelFn(key), current, prior, pctChange, orders };
  });
}
function deltaColor(pct: number | null | undefined): string {
  if (pct == null) return 'var(--muted)';
  return pct >= 0 ? '#10b981' : '#ef4444';
}
function formatPct(pct: number | null | undefined): string {
  if (pct == null) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
const EMPTY_FILTERS: Filters = { storeId: '', city: '', category: '', gender: '', payment: '' };

export default function StorePerformanceTrends() {
  // Data arrives per tile over an NDJSON stream — no SQL in the frontend.
  const { tiles, status, errors, fatalError } = useDashboardTiles('store-performance-trends');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [granularity, setGranularity] = useState<Granularity>('month');

  const isReady = (id: string) => status[id] === 'ready' || status[id] === 'error';
  // The date range drives the period spine, so nothing can render without it.
  const loadingInit = !isReady('date-range');
  // Only the grain tile actually in use gates the "Updating…" note.
  const loadingData = filters.category ? !isReady('daily-store-category') : !isReady('daily-store');
  const error =
    errors['date-range'] || errors['daily-store'] || (filters.category ? errors['daily-store-category'] : null) || null;

  const filterOptions: FilterOptions = useMemo(
    () => ({
      stores: ((tiles['stores']?.rows ?? []) as Row[]).map((r) => ({ id: n(r.branch_id), name: s(r.branch_name) })),
      cities: ((tiles['cities']?.rows ?? []) as Row[]).map((r) => s(r.city)),
      categories: ((tiles['categories']?.rows ?? []) as Row[]).map((r) => s(r.category)),
      genders: ((tiles['genders']?.rows ?? []) as Row[]).map((r) => s(r.gender)),
      payments: ((tiles['payments']?.rows ?? []) as Row[]).map((r) => s(r.payment)),
    }),
    [tiles]
  );

  const dateRange = useMemo(() => {
    const rangeRow = (tiles['date-range']?.rows ?? [])[0] as Row | undefined;
    if (rangeRow?.min_date && rangeRow?.max_date) {
      return { min: toUTCDate(rangeRow.min_date), max: toUTCDate(rangeRow.max_date) };
    }
    return null;
  }, [tiles]);

  // A category filter needs the category-qualified grain (an order counts once
  // per category it contains); every other filter reads the plain grain.
  const grainRows: GrainRow[] = useMemo(() => {
    const tileId = filters.category ? 'daily-store-category' : 'daily-store';
    return ((tiles[tileId]?.rows ?? []) as Row[]).map((r) => ({
      day: s(r.day),
      branchId: n(r.branch_id),
      branchName: s(r.branch_name),
      city: s(r.city),
      gender: s(r.gender),
      payment: s(r.payment),
      category: r.category == null ? null : s(r.category),
      revenue: n(r.revenue),
      orders: n(r.orders),
    }));
  }, [tiles, filters.category]);

  // Replaces the dynamically-built SQL WHERE clause.
  const filteredGrain = useMemo(
    () =>
      grainRows.filter(
        (r) =>
          (!filters.storeId || r.branchId === Number(filters.storeId)) &&
          (!filters.city || r.city === filters.city) &&
          (!filters.gender || r.gender === filters.gender) &&
          (!filters.payment || r.payment === filters.payment) &&
          (!filters.category || r.category === filters.category)
      ),
    [grainRows, filters]
  );

  const dailyOverall: DailyRow[] = useMemo(() => {
    const map = new Map<string, DailyRow>();
    for (const r of filteredGrain) {
      const cur = map.get(r.day) ?? { day: r.day, revenue: 0, orders: 0 };
      cur.revenue += r.revenue;
      cur.orders += r.orders;
      map.set(r.day, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredGrain]);

  const dailyByStore: StoreDailyRow[] = useMemo(() => {
    const map = new Map<string, StoreDailyRow>();
    for (const r of filteredGrain) {
      const key = `${r.branchId}|${r.day}`;
      const cur =
        map.get(key) ?? { day: r.day, revenue: 0, orders: 0, branchId: r.branchId, branchName: r.branchName };
      cur.revenue += r.revenue;
      cur.orders += r.orders;
      map.set(key, cur);
    }
    return Array.from(map.values());
  }, [filteredGrain]);

  const config = GRANULARITY_CONFIG[granularity];
  const bucketFn = config.bucket === 'week' ? weekKey : monthKey;
  const labelFn = config.bucket === 'week' ? weekLabel : monthLabel;

  const spine = useMemo(() => {
    if (!dateRange) return [] as string[];
    return config.bucket === 'week' ? buildWeekSpine(dateRange.min, dateRange.max) : buildMonthSpine(dateRange.min, dateRange.max);
  }, [dateRange, config.bucket]);

  const overallMap = useMemo(() => bucketize(dailyOverall, bucketFn), [dailyOverall, config.bucket]);
  const series = useMemo(
    () => buildSeries(spine, overallMap, config.offset, labelFn),
    [spine, overallMap, config.offset]
  );

  const storeBuckets = useMemo(() => {
    const map = new Map<number, { name: string; buckets: Map<string, { revenue: number; orders: number }> }>();
    for (const r of dailyByStore) {
      let entry = map.get(r.branchId);
      if (!entry) {
        entry = { name: r.branchName, buckets: new Map() };
        map.set(r.branchId, entry);
      }
      const key = bucketFn(toUTCDate(r.day));
      const cur = entry.buckets.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += r.revenue;
      cur.orders += r.orders;
      entry.buckets.set(key, cur);
    }
    return map;
  }, [dailyByStore, config.bucket]);

  const storePerformance: StorePerfRow[] = useMemo(() => {
    if (spine.length === 0) return [];
    const latestIdx = spine.length - 1;
    const latestKey = spine[latestIdx];
    const priorIdx = latestIdx - config.offset;
    const priorKey = priorIdx >= 0 ? spine[priorIdx] : null;
    const rows: StorePerfRow[] = [];
    for (const [branchId, entry] of storeBuckets.entries()) {
      const current = entry.buckets.get(latestKey)?.revenue ?? 0;
      const orders = entry.buckets.get(latestKey)?.orders ?? 0;
      const prior = priorKey ? entry.buckets.get(priorKey)?.revenue ?? 0 : null;
      const pct = prior != null && prior > 0 ? ((current - prior) / prior) * 100 : null;
      rows.push({ branchId, name: entry.name, current, prior, pct, orders });
    }
    return rows.sort((a, b) => b.current - a.current);
  }, [storeBuckets, spine, config.offset]);

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }
  if (loadingInit) {
    return <p className="muted">Loading store performance dashboard…</p>;
  }
  if (error && !dateRange) {
    return <div className="error-box">Failed to load sales data: {error}</div>;
  }
  if (!dateRange || spine.length === 0) {
    return <p className="muted">No sales data available yet.</p>;
  }

  const latestPoint = series[series.length - 1];
  const activeFilterLabels = [
    filters.storeId && filterOptions.stores.find((st) => st.id === Number(filters.storeId))?.name,
    filters.city,
    filters.category,
    filters.gender,
    filters.payment,
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={filterLabelStyle}>
          Store
          <select style={selectStyle} value={filters.storeId} onChange={(e) => setFilters({ ...filters, storeId: e.target.value })}>
            <option value="">All Stores</option>
            {filterOptions.stores.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          City
          <select style={selectStyle} value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
            <option value="">All Cities</option>
            {filterOptions.cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          Category
          <select
            style={selectStyle}
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          Gender
          <select style={selectStyle} value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
            <option value="">All Genders</option>
            {filterOptions.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          Payment Method
          <select style={selectStyle} value={filters.payment} onChange={(e) => setFilters({ ...filters, payment: e.target.value })}>
            <option value="">All Methods</option>
            {filterOptions.payments.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
          Reset filters
        </button>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {(Object.keys(GRANULARITY_CONFIG) as Granularity[]).map((g) => (
            <button
              key={g}
              className={`btn ${granularity === g ? 'btn-primary' : ''}`}
              onClick={() => setGranularity(g)}
            >
              {GRANULARITY_CONFIG[g].shortLabel}
            </button>
          ))}
        </div>
        {loadingData && <p className="muted small" style={{ width: '100%', margin: 0 }}>Updating…</p>}
        {activeFilterLabels.length > 0 && (
          <p className="muted small" style={{ width: '100%', margin: 0 }}>Filtered by: {activeFilterLabels.join(', ')}</p>
        )}
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">{latestPoint ? labelFn(latestPoint.key) : ''} Revenue</div>
          <div className="kpi-value">{inr.format(latestPoint?.current ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{config.compareLabel}</div>
          <div className="kpi-value">{latestPoint?.prior != null ? inr.format(latestPoint.prior) : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{config.shortLabel} Change</div>
          <div className="kpi-value" style={{ color: deltaColor(latestPoint?.pctChange) }}>
            {formatPct(latestPoint?.pctChange)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Orders (latest {config.bucket})</div>
          <div className="kpi-value">{num.format(latestPoint?.orders ?? 0)}</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>{config.label} Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={series} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--muted)" angle={-30} textAnchor="end" interval={0} />
            <YAxis stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
            <Legend wrapperStyle={legendStyle} />
            <Bar dataKey="current" name="Current" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="prior" name={config.compareLabel} fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h3>Recent Periods</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Revenue</th>
              <th>{config.compareLabel}</th>
              <th>% Change</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {series
              .slice(-12)
              .slice()
              .reverse()
              .map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td>{inr.format(p.current)}</td>
                  <td>{p.prior != null ? inr.format(p.prior) : '—'}</td>
                  <td style={{ color: deltaColor(p.pctChange) }}>{formatPct(p.pctChange)}</td>
                  <td>{num.format(p.orders)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="chart-card">
        <h3>
          Store Performance — {latestPoint ? labelFn(latestPoint.key) : ''} vs {config.compareLabel}
        </h3>
        {storePerformance.length === 0 ? (
          <p className="muted">No store data available for the selected filters.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(280, Math.min(storePerformance.length, 15) * 32)}>
              <BarChart data={storePerformance.slice(0, 15)} layout="vertical" margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} />
                <YAxis type="category" dataKey="name" stroke="var(--muted)" width={140} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="current" name="Current" fill={PALETTE[0]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="prior" name={config.compareLabel} fill={PALETTE[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <table className="data-table" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Current</th>
                  <th>{config.compareLabel}</th>
                  <th>% Change</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {storePerformance.map((p) => (
                  <tr key={p.branchId}>
                    <td>{p.name}</td>
                    <td>{inr.format(p.current)}</td>
                    <td>{p.prior != null ? inr.format(p.prior) : '—'}</td>
                    <td style={{ color: deltaColor(p.pct) }}>{formatPct(p.pct)}</td>
                    <td>{num.format(p.orders)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

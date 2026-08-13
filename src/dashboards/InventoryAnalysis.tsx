import { useMemo } from 'react';
import {
  BarChart,
  Bar,
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

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#06b6d4', '#a855f7', '#ec4899', '#ef4444', '#84cc16'];

const formatINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
const formatNum = (v: number) => new Intl.NumberFormat('en-IN').format(v);
const formatLakh = (v: number) => `₹${(v / 100000).toFixed(1)}L`;

const tooltipStyle = {
  background: 'var(--panel-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
};
const labelStyle = { color: 'var(--muted)' };
const legendStyle = { color: 'var(--muted)', fontSize: 13 };

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown, fallback = 'Unknown') => (v == null ? fallback : String(v));

interface Kpis {
  totalUnits: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}
interface CategoryRow { name: string; units: number; stockValue: number; }
interface BranchRow { name: string; units: number; stockValue: number; }
interface SubcategoryRow { name: string; units: number; }
interface LowStockRow { product: string; branch: string; quantity: number; reorderLevel: number; }

export default function InventoryAnalysis() {
  // Data arrives per tile over an NDJSON stream — the SQL lives in
  // backend/data/tiles/inventory-analysis.json.
  const { tiles, status, errors, fatalError } = useDashboardTiles('inventory-analysis');

  // One flag per tile so each section paints as soon as its own query lands.
  const loading = status['kpis'] !== 'ready' && status['kpis'] !== 'error';
  const loadingCategory = status['by-category'] !== 'ready' && status['by-category'] !== 'error';
  const loadingBranch = status['by-branch'] !== 'ready' && status['by-branch'] !== 'error';
  const loadingSubcategory = status['by-subcategory'] !== 'ready' && status['by-subcategory'] !== 'error';
  const loadingLowStock = status['low-stock'] !== 'ready' && status['low-stock'] !== 'error';

  const error =
    errors['kpis'] ||
    errors['by-category'] ||
    errors['by-branch'] ||
    errors['by-subcategory'] ||
    errors['low-stock'] ||
    null;

  const kpis: Kpis | null = useMemo(() => {
    const k = ((tiles['kpis']?.rows ?? []) as Row[])[0] as Row | undefined;
    if (!k) return null;
    return {
      totalUnits: n(k.total_units),
      stockValue: n(k.stock_value),
      lowStockCount: n(k.low_stock_count),
      outOfStockCount: n(k.out_of_stock_count),
    };
  }, [tiles]);

  const byCategory: CategoryRow[] = useMemo(
    () =>
      ((tiles['by-category']?.rows ?? []) as Row[]).map((r) => ({
        name: s(r.category),
        units: n(r.units),
        stockValue: n(r.stock_value),
      })),
    [tiles]
  );

  const byBranch: BranchRow[] = useMemo(
    () =>
      ((tiles['by-branch']?.rows ?? []) as Row[]).map((r) => ({
        name: s(r.branch),
        units: n(r.units),
        stockValue: n(r.stock_value),
      })),
    [tiles]
  );

  const bySubcategory: SubcategoryRow[] = useMemo(
    () => ((tiles['by-subcategory']?.rows ?? []) as Row[]).map((r) => ({ name: s(r.subcategory), units: n(r.units) })),
    [tiles]
  );

  const lowStock: LowStockRow[] = useMemo(
    () =>
      ((tiles['low-stock']?.rows ?? []) as Row[]).map((r) => ({
        product: s(r.product),
        branch: s(r.branch),
        quantity: n(r.quantity),
        reorderLevel: n(r.reorder_level),
      })),
    [tiles]
  );

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }

  return (
    <div>
      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Total Stock Units</div>
          <div className="kpi-value">{loading ? '—' : formatNum(kpis?.totalUnits ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Stock Value (at Cost)</div>
          <div className="kpi-value">{loading ? '—' : formatINR(kpis?.stockValue ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Low Stock Lines</div>
          <div className="kpi-value">{loading ? '—' : formatNum(kpis?.lowStockCount ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Out of Stock Lines</div>
          <div className="kpi-value">{loading ? '—' : formatNum(kpis?.outOfStockCount ?? 0)}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Stock Value by Category</h3>
          {loadingCategory ? (
            <div className="muted">Loading…</div>
          ) : byCategory.length === 0 ? (
            <div className="muted">No data for the selected period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byCategory} dataKey="stockValue" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Units in Stock by Subcategory (Top 10)</h3>
          {loadingSubcategory ? (
            <div className="muted">Loading…</div>
          ) : bySubcategory.length === 0 ? (
            <div className="muted">No data for the selected period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bySubcategory} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => formatNum(v)} width={70} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number) => formatNum(v)} />
                <Bar dataKey="units" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h3>Stock Value by Store (Top 15)</h3>
        {loadingBranch ? (
          <div className="muted">Loading…</div>
        ) : byBranch.length === 0 ? (
          <div className="muted">No data for the selected period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={byBranch} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={70} />
              <YAxis tickFormatter={(v: number) => formatLakh(v)} width={70} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="stockValue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Low Stock Alerts (Top 20, Most Below Reorder Level)</h3>
        {loadingLowStock ? (
          <div className="muted">Loading…</div>
        ) : lowStock.length === 0 ? (
          <div className="muted">No data for the selected period.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Branch</th>
                  <th>Quantity</th>
                  <th>Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((r, i) => (
                  <tr key={i}>
                    <td>{r.product}</td>
                    <td>{r.branch}</td>
                    <td style={r.quantity === 0 ? { color: 'var(--danger)' } : undefined}>{formatNum(r.quantity)}</td>
                    <td>{formatNum(r.reorderLevel)}</td>
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

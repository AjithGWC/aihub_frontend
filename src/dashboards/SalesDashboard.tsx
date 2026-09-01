import { useMemo } from 'react';
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

const PALETTE = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#a855f7', '#ec4899', '#84cc16'];

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

const n = (v: unknown) => Number(v) || 0;
const s = (v: unknown, fallback = 'Unknown') => (v == null ? fallback : String(v));

interface Kpis {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}
interface MonthlyRow { month: string; revenue: number; }
interface NameRevenueRow { name: string; revenue: number; }
interface BranchRow { name: string; revenue: number; orders: number; }
interface PaymentRow { name: string; revenue: number; orders: number; }
interface ProductRow { product: string; brand: string; units: number; revenue: number; }

export default function SalesDashboard() {
  // Every query lives in backend/data/tiles/sales-dashboard.json; tiles stream in
  // independently over NDJSON so each section paints as soon as its data lands.
  const { tiles, status, errors, fatalError } = useDashboardTiles('sales-dashboard');

  const isPending = (id: string) => status[id] !== 'ready' && status[id] !== 'error';
  const loading = isPending('kpis');
  const loadingUnits = isPending('total-units');
  const loadingMonthly = isPending('monthly-revenue');
  const loadingGender = isPending('revenue-by-gender');
  const loadingCity = isPending('revenue-by-city');
  const loadingBranch = isPending('revenue-by-branch');
  const loadingCategory = isPending('revenue-by-category');
  const loadingPayment = isPending('revenue-by-payment');
  const loadingProducts = isPending('top-products');

  const error =
    errors['kpis'] ||
    errors['total-units'] ||
    errors['monthly-revenue'] ||
    errors['revenue-by-gender'] ||
    errors['revenue-by-city'] ||
    errors['revenue-by-branch'] ||
    errors['revenue-by-category'] ||
    errors['revenue-by-payment'] ||
    errors['top-products'] ||
    null;

  const kpis: Kpis | null = useMemo(() => {
    const k = (tiles['kpis']?.rows ?? [])[0] as Row | undefined;
    if (!k) return status['kpis'] === 'ready' ? { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 } : null;
    return {
      totalOrders: n(k.total_orders),
      totalRevenue: n(k.total_revenue),
      avgOrderValue: n(k.avg_order_value),
    };
  }, [tiles, status]);

  const totalUnits: number = useMemo(
    () => n(((tiles['total-units']?.rows ?? [])[0] as Row | undefined)?.total_units),
    [tiles]
  );

  const monthly: MonthlyRow[] = useMemo(
    () => ((tiles['monthly-revenue']?.rows ?? []) as Row[]).map((r) => ({ month: s(r.month), revenue: n(r.revenue) })),
    [tiles]
  );

  const byGender: NameRevenueRow[] = useMemo(
    () => ((tiles['revenue-by-gender']?.rows ?? []) as Row[]).map((r) => ({ name: s(r.gender), revenue: n(r.revenue) })),
    [tiles]
  );

  const byCity: NameRevenueRow[] = useMemo(
    () => ((tiles['revenue-by-city']?.rows ?? []) as Row[]).map((r) => ({ name: s(r.city), revenue: n(r.revenue) })),
    [tiles]
  );

  const byBranch: BranchRow[] = useMemo(
    () =>
      ((tiles['revenue-by-branch']?.rows ?? []) as Row[]).map((r) => ({
        name: s(r.branch),
        revenue: n(r.revenue),
        orders: n(r.orders),
      })),
    [tiles]
  );

  const byCategory: NameRevenueRow[] = useMemo(
    () =>
      ((tiles['revenue-by-category']?.rows ?? []) as Row[]).map((r) => ({ name: s(r.category), revenue: n(r.revenue) })),
    [tiles]
  );

  const byPayment: PaymentRow[] = useMemo(
    () =>
      ((tiles['revenue-by-payment']?.rows ?? []) as Row[]).map((r) => ({
        name: s(r.payment_method),
        revenue: n(r.revenue),
        orders: n(r.orders),
      })),
    [tiles]
  );

  const topProducts: ProductRow[] = useMemo(
    () =>
      ((tiles['top-products']?.rows ?? []) as Row[]).map((r) => ({
        product: s(r.product),
        brand: s(r.brand),
        units: n(r.units),
        revenue: n(r.revenue),
      })),
    [tiles]
  );

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }

  return (
    <div>
      {error && <div className="error-box" style={{ marginBottom: 16 }}>Failed to load sales data: {error}</div>}

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value">{loading ? '…' : inr.format(kpis?.totalRevenue ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Orders</div>
          <div className="kpi-value">{loading ? '…' : num.format(kpis?.totalOrders ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Order Value</div>
          <div className="kpi-value">{loading ? '…' : inr.format(kpis?.avgOrderValue ?? 0)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Units Sold</div>
          <div className="kpi-value">{loadingUnits ? '…' : num.format(totalUnits)}</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>Monthly Revenue Trend</h3>
        {loadingMonthly ? (
          <p className="muted">Loading…</p>
        ) : monthly.length === 0 ? (
          <p className="muted">No order data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
              <Line type="monotone" dataKey="revenue" stroke={PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Revenue by Customer Gender</h3>
        {loadingGender ? (
          <p className="muted">Loading…</p>
        ) : byGender.length === 0 ? (
          <p className="muted">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byGender} dataKey="revenue" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {byGender.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
              <Legend wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Top Cities by Revenue</h3>
        {loadingCity ? (
          <p className="muted">Loading…</p>
        ) : byCity.length === 0 ? (
          <p className="muted">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byCity} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted)" angle={-20} textAnchor="end" interval={0} />
              <YAxis stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
              <Bar dataKey="revenue" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Revenue by Store</h3>
        {loadingBranch ? (
          <p className="muted">Loading…</p>
        ) : byBranch.length === 0 ? (
          <p className="muted">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={byBranch} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted)" angle={-25} textAnchor="end" interval={0} />
              <YAxis stroke="var(--muted)" tickFormatter={(v: number) => inr.format(v)} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
              <Bar dataKey="revenue" fill={PALETTE[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Revenue by Category</h3>
        {loadingCategory ? (
          <p className="muted">Loading…</p>
        ) : byCategory.length === 0 ? (
          <p className="muted">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byCategory}>
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
        <h3>Payment Method Split</h3>
        {loadingPayment ? (
          <p className="muted">Loading…</p>
        ) : byPayment.length === 0 ? (
          <p className="muted">No data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byPayment}
                dataKey="revenue"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {byPayment.map((_, i) => (
                  <Cell key={i} fill={PALETTE[(i + 3) % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => inr.format(v)} />
              <Legend wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-card">
        <h3>Top 10 Products by Revenue</h3>
        {loadingProducts ? (
          <p className="muted">Loading…</p>
        ) : topProducts.length === 0 ? (
          <p className="muted">No data available.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
}

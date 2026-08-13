import { useMemo, useState } from 'react';
import {
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
import { DrillChart, drillLevel } from './_shared/DrillChart';
import {
  CHART_COLORS,
  DataGrid,
  Row,
  SkeletonChart,
  SkeletonKpiValue,
  filterLabelStyle,
  formatCompact,
  inr,
  legendStyle,
  n,
  num,
  s,
  selectStyle,
  tooltipStyle,
} from './_shared/dashboardKit';

const REGIONS = ['', 'North', 'South', 'East', 'West', 'Central'];
const GENDERS = ['', 'Male', 'Female'];
const PAYMENTS = ['', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'UPI'];
const CATEGORIES = ['', 'Men', 'Women', 'Kids', 'Footwear', 'Accessories'];

interface GeoRow extends Row {
  region: string;
  state: string;
  city: string;
  branch: string;
  orders: number;
  revenue: number;
}
interface MerchRow extends Row {
  category: string;
  subcategory: string;
  product: string;
  units: number;
  revenue: number;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Sums a numeric field of rows grouped by `groupKey`, sorted by revenue desc. */
function rollUp<T extends Row>(rows: T[], groupKey: keyof T, valueKeys: string[]): Row[] {
  const byGroup = new Map<string, Row>();
  for (const row of rows) {
    const key = s(row[groupKey]);
    const existing = byGroup.get(key) ?? { [groupKey as string]: key, ...Object.fromEntries(valueKeys.map((k) => [k, 0])) };
    for (const vk of valueKeys) existing[vk] = n(existing[vk]) + n(row[vk]);
    byGroup.set(key, existing);
  }
  return [...byGroup.values()].sort((a, b) => n(b.revenue) - n(a.revenue));
}

export default function RetailSalesExplorer() {
  const [region, setRegion] = useState('');
  const [customerGender, setCustomerGender] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [category, setCategory] = useState('');

  const { tiles, status, errors, fatalError } = useDashboardTiles('retail-sales-explorer', {
    region,
    customer_gender: customerGender,
    payment_method: paymentMethod,
    category,
  });

  const isReady = (id: string) => status[id] === 'ready';
  const isError = (id: string) => status[id] === 'error';
  const isLoading = (id: string) => status[id] === 'loading' || status[id] === undefined;

  const kpi = useMemo(() => {
    const row = (tiles['kpis']?.rows ?? [])[0] as Row | undefined;
    if (!row) return null;
    return { orders: n(row.orders), revenue: n(row.revenue), discount: n(row.discount), units: n(row.units) };
  }, [tiles]);
  const aov = kpi && kpi.orders > 0 ? kpi.revenue / kpi.orders : 0;
  const discountRate = kpi && kpi.revenue > 0 ? (kpi.discount / (kpi.revenue + kpi.discount)) * 100 : 0;

  const monthlyTrend = useMemo(
    () => ((tiles['monthly-trend']?.rows ?? []) as Row[]).map((r) => ({ month: s(r.month), revenue: n(r.revenue), orders: n(r.orders) })),
    [tiles]
  );

  const paymentMix = useMemo(
    () => ((tiles['payment-mix']?.rows ?? []) as Row[]).map((r) => ({ payment: s(r.payment), revenue: n(r.revenue), orders: n(r.orders) })),
    [tiles]
  );

  const geoRows = ((tiles['geo-detail']?.rows ?? []) as GeoRow[]) ?? [];
  const merchRows = ((tiles['merch-detail']?.rows ?? []) as MerchRow[]) ?? [];

  const filterKey = `${region}|${customerGender}|${paymentMethod}|${category}`;

  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }

  return (
    <div>
      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={filterLabelStyle}>
          Region
          <select style={selectStyle} value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r || 'All regions'}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          Customer
          <select style={selectStyle} value={customerGender} onChange={(e) => setCustomerGender(e.target.value)}>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g || 'All customers'}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          Payment method
          <select style={selectStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENTS.map((p) => (
              <option key={p} value={p}>
                {p || 'All payment methods'}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          Category
          <select style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c || 'All categories'}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Revenue</div>
          {isLoading('kpis') ? <SkeletonKpiValue /> : <div className="kpi-value">{kpi ? formatCompact(kpi.revenue) : '—'}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Orders</div>
          {isLoading('kpis') ? <SkeletonKpiValue /> : <div className="kpi-value">{kpi ? num.format(kpi.orders) : '—'}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Units Sold</div>
          {isLoading('kpis') ? <SkeletonKpiValue /> : <div className="kpi-value">{kpi ? num.format(kpi.units) : '—'}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Order Value</div>
          {isLoading('kpis') ? <SkeletonKpiValue /> : <div className="kpi-value">{kpi ? inr.format(aov) : '—'}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Discount Rate</div>
          {isLoading('kpis') ? <SkeletonKpiValue /> : <div className="kpi-value">{kpi ? `${discountRate.toFixed(1)}%` : '—'}</div>}
        </div>
      </div>
      {isError('kpis') && <div className="error-box">{errors['kpis']}</div>}

      <div className="chart-card">
        <h3>Monthly Revenue Trend</h3>
        {isError('monthly-trend') && <div className="error-box">{errors['monthly-trend']}</div>}
        {isLoading('monthly-trend') && <SkeletonChart height={300} />}
        {isReady('monthly-trend') &&
          (monthlyTrend.length === 0 ? (
            <div className="muted">No data for the selected filters.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={monthLabel} interval="preserveStartEnd" />
                <YAxis tickFormatter={(v: number) => formatCompact(v)} width={80} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} labelFormatter={monthLabel} formatter={(v: number) => inr.format(v)} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS[0]} strokeWidth={2} dot={monthlyTrend.length <= 24} />
              </LineChart>
            </ResponsiveContainer>
          ))}
      </div>

      <div className="chart-grid">
        <DrillChart
          resetKey={filterKey}
          loading={isLoading('geo-detail')}
          error={isError('geo-detail') ? errors['geo-detail'] : null}
          rootLabel="All regions"
          levels={[
            drillLevel<Row>({
              kind: 'bar',
              title: 'Revenue by region',
              categoryKey: 'region',
              series: [{ key: 'revenue', name: 'Revenue' }],
              valueFormatter: formatCompact,
              drillKey: 'region',
              data: () => rollUp(geoRows, 'region', ['revenue', 'orders']),
            }),
            drillLevel<Row>({
              kind: 'bar',
              title: (ctx) => `${ctx.value} — revenue by state`,
              categoryKey: 'state',
              series: [{ key: 'revenue', name: 'Revenue' }],
              valueFormatter: formatCompact,
              drillKey: 'state',
              data: (ctx) => rollUp(geoRows.filter((r) => r.region === ctx.get('region')), 'state', ['revenue', 'orders']),
            }),
            drillLevel<Row>({
              kind: 'bar',
              title: (ctx) => `${ctx.value} — revenue by city`,
              categoryKey: 'city',
              series: [{ key: 'revenue', name: 'Revenue' }],
              valueFormatter: formatCompact,
              drillKey: 'city',
              data: (ctx) => rollUp(geoRows.filter((r) => r.region === ctx.get('region') && r.state === ctx.get('state')), 'city', ['revenue', 'orders']),
            }),
            drillLevel<GeoRow>({
              kind: 'custom',
              title: (ctx) => `${ctx.value} — branches`,
              data: (ctx) => geoRows.filter((r) => r.region === ctx.get('region') && r.state === ctx.get('state') && r.city === ctx.get('city')),
              render: (rows) => (
                <DataGrid<GeoRow>
                  rowData={rows}
                  fileName="branch-revenue"
                  pagination={false}
                  height={220}
                  columnDefs={[
                    { field: 'branch', headerName: 'Branch' },
                    { field: 'orders', headerName: 'Orders' },
                    { field: 'revenue', headerName: 'Revenue', valueFormatter: (p) => inr.format(n(p.value)) },
                  ]}
                />
              ),
            }),
          ]}
        />

        <div className="chart-card">
          <h3>Revenue by Payment Method</h3>
          {isError('payment-mix') && <div className="error-box">{errors['payment-mix']}</div>}
          {isLoading('payment-mix') && <SkeletonChart height={300} />}
          {isReady('payment-mix') &&
            (paymentMix.length === 0 ? (
              <div className="muted">No data for the selected filters.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={paymentMix} dataKey="revenue" nameKey="payment" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {paymentMix.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => inr.format(v)} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            ))}
        </div>
      </div>

      <DrillChart
        resetKey={filterKey}
        loading={isLoading('merch-detail')}
        error={isError('merch-detail') ? errors['merch-detail'] : null}
        rootLabel="All categories"
        levels={[
          drillLevel<Row>({
            kind: 'bar',
            title: 'Revenue by category',
            categoryKey: 'category',
            series: [{ key: 'revenue', name: 'Revenue' }],
            valueFormatter: formatCompact,
            drillKey: 'category',
            data: () => rollUp(merchRows, 'category', ['revenue', 'units']),
          }),
          drillLevel<Row>({
            kind: 'bar',
            title: (ctx) => `${ctx.value} — revenue by subcategory`,
            categoryKey: 'subcategory',
            series: [{ key: 'revenue', name: 'Revenue' }],
            valueFormatter: formatCompact,
            drillKey: 'subcategory',
            data: (ctx) => rollUp(merchRows.filter((r) => r.category === ctx.get('category')), 'subcategory', ['revenue', 'units']),
          }),
          drillLevel<MerchRow>({
            kind: 'custom',
            title: (ctx) => `${ctx.value} — top products`,
            data: (ctx) =>
              merchRows
                .filter((r) => r.category === ctx.get('category') && r.subcategory === ctx.get('subcategory'))
                .sort((a, b) => n(b.revenue) - n(a.revenue))
                .slice(0, 20),
            render: (rows) => (
              <DataGrid<MerchRow>
                rowData={rows}
                fileName="product-revenue"
                pagination={false}
                height={260}
                columnDefs={[
                  { field: 'product', headerName: 'Product' },
                  { field: 'units', headerName: 'Units' },
                  { field: 'revenue', headerName: 'Revenue', valueFormatter: (p) => inr.format(n(p.value)) },
                ]}
              />
            ),
          }),
        ]}
      />
    </div>
  );
}

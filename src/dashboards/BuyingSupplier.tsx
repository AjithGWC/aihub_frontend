import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ColDef } from 'ag-grid-community';
import { useDashboardTiles } from '../hooks/useDashboardTiles';
import {
  Row,
  n,
  s,
  inr,
  num,
  formatCompact,
  NEGATIVE,
  CHART_COLORS,
  tooltipStyle,
  legendStyle,
  selectStyle,
  filterLabelStyle,
  heatStyle,
  Card,
  DataGrid,
  SkeletonChart,
  SkeletonTable,
} from './_shared/dashboardKit';

// Site scoping (stores 6/530/820 vs. warehouse 1070) and the supplier revenue /
// GRN thresholds now live in the tile manifest SQL.
const DEFAULT_MONTH_KEY = '2026-06';
const MIN_SUPPLIER_REVENUE = 10000; // avoid tiny-sample margin noise

function monthKey(d: unknown): string {
  return String(d).slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

interface SupplierRow {
  supplier: string;
  revenue: number;
  gp: number;
  grnQty: number;
  unitsSold: number;
  storeClosingQty: number;
}
interface DivisionBuyRow {
  division: string;
  grnQty: number;
  unitsSold: number;
}
interface MarginRow extends Row {
  supplier: string;
  revenue: number;
  gp: number;
  marginPct: number;
}
interface DivisionBuyChartRow extends Row {
  division: string;
  grnQty: number;
  unitsSold: number;
  sellThroughRatio: number;
}
interface OverBuyRow extends Row {
  supplier: string;
  grnQty: number;
  unitsSold: number;
  sellThroughRatio: number;
}
interface UnderBuyRow extends Row {
  supplier: string;
  unitsSold: number;
  storeClosingQty: number;
  daysOfCover: number;
}

export default function BuyingSupplier() {
  const [selectedMonth, setSelectedMonth] = useState<string>(DEFAULT_MONTH_KEY);

  // Data arrives per tile over an NDJSON stream — no SQL in the frontend.
  // Rollup measures are already sign-corrected (revenue/units positive).
  const { tiles, status, errors, fatalError } = useDashboardTiles('buying-supplier', {
    month: `${selectedMonth}-01`,
  });

  // Each section shows its own skeleton until its tile lands.
  const loadingSupplier = status['supplier-month'] !== 'ready' && status['supplier-month'] !== 'error';
  const loadingTotal = status['total-revenue'] !== 'ready' && status['total-revenue'] !== 'error';
  const loadingDivision = status['division-buy'] !== 'ready' && status['division-buy'] !== 'error';
  const loadingData = loadingSupplier || loadingTotal || loadingDivision;
  const error = errors['months'] || errors['total-revenue'] || errors['supplier-month'] || errors['division-buy'] || null;

  // The month list is kept in state so it survives the stream restart that a
  // month change triggers (tiles reset while the new month is fetched).
  const monthOptions = useMemo(
    () => ((tiles['months']?.rows ?? []) as Row[]).map((r) => monthKey(r.start_date)),
    [tiles]
  );
  const [months, setMonths] = useState<string[]>([]);
  useEffect(() => {
    if (monthOptions.length > 0) setMonths(monthOptions);
  }, [monthOptions]);
  useEffect(() => {
    if (months.length > 0 && !months.includes(selectedMonth)) setSelectedMonth(months[months.length - 1]);
  }, [months, selectedMonth]);
  const loadingInit = months.length === 0 && status['months'] !== 'ready' && status['months'] !== 'error';

  const totalRevenue = useMemo(
    () => n(((tiles['total-revenue']?.rows ?? []) as Row[])[0]?.total_revenue),
    [tiles]
  );

  const supplierRows: SupplierRow[] = useMemo(
    () =>
      ((tiles['supplier-month']?.rows ?? []) as Row[]).map((r) => ({
        supplier: s(r.supplier),
        revenue: n(r.revenue),
        gp: n(r.gp),
        grnQty: n(r.grn_qty),
        unitsSold: n(r.units_sold),
        storeClosingQty: n(r.store_closing_qty),
      })),
    [tiles]
  );

  const divisionBuyRows: DivisionBuyRow[] = useMemo(
    () =>
      ((tiles['division-buy']?.rows ?? []) as Row[]).map((r) => ({
        division: s(r.division),
        grnQty: n(r.grn_qty),
        unitsSold: n(r.units_sold),
      })),
    [tiles]
  );

  const bestMarginSuppliers = useMemo(() => {
    const withMargin = supplierRows
      .filter((r) => r.revenue >= MIN_SUPPLIER_REVENUE)
      .map((r) => ({ ...r, marginPct: (r.gp / r.revenue) * 100 }));
    const sorted = withMargin.slice().sort((a, b) => b.marginPct - a.marginPct);
    return { top: sorted.slice(0, 10), bottom: sorted.slice(-10).reverse() };
  }, [supplierRows]);

  const overBuyingSuppliers: OverBuyRow[] = useMemo(
    () =>
      supplierRows
        .filter((r) => r.grnQty >= 5000)
        .map((r) => ({ ...r, sellThroughRatio: r.grnQty > 0 ? r.unitsSold / r.grnQty : 0 }))
        .sort((a, b) => a.sellThroughRatio - b.sellThroughRatio)
        .slice(0, 15),
    [supplierRows]
  );

  const underBuyingSuppliers: UnderBuyRow[] = useMemo(
    () =>
      supplierRows
        .filter((r) => r.unitsSold >= 20)
        .map((r) => ({ ...r, daysOfCover: r.storeClosingQty / (r.unitsSold / 30) }))
        .filter((r) => r.daysOfCover <= 14)
        .sort((a, b) => a.daysOfCover - b.daysOfCover)
        .slice(0, 15),
    [supplierRows]
  );

  const supplierConcentration = useMemo(() => {
    const top10 = supplierRows
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((r) => ({ ...r, sharePct: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0 }));
    const top10Total = top10.reduce((acc, r) => acc + r.revenue, 0);
    return { top10, top10SharePct: totalRevenue > 0 ? (top10Total / totalRevenue) * 100 : 0 };
  }, [supplierRows, totalRevenue]);

  const divisionBuyChart: DivisionBuyChartRow[] = useMemo(
    () =>
      divisionBuyRows.map((r) => ({
        ...r,
        sellThroughRatio: r.grnQty > 0 ? (r.unitsSold / r.grnQty) * 100 : 0,
      })),
    [divisionBuyRows]
  );

  const divisionBuyTableRows: DivisionBuyChartRow[] = useMemo(
    () => divisionBuyChart.slice().sort((a, b) => a.sellThroughRatio - b.sellThroughRatio),
    [divisionBuyChart]
  );

  // ---- AG Grid column defs ----
  const bestMarginColumns: ColDef<MarginRow>[] = useMemo(() => {
    const maxRevenue = Math.max(1, ...bestMarginSuppliers.top.map((r) => r.revenue));
    return [
      { field: 'supplier', headerName: 'Supplier' },
      {
        field: 'revenue',
        headerName: 'Revenue',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxRevenue),
      },
      { field: 'gp', headerName: 'GP', valueFormatter: (p) => inr.format(p.value ?? 0) },
      { field: 'marginPct', headerName: 'Margin %', valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%` },
    ];
  }, [bestMarginSuppliers.top]);

  const worstMarginColumns: ColDef<MarginRow>[] = useMemo(() => {
    const maxRevenue = Math.max(1, ...bestMarginSuppliers.bottom.map((r) => r.revenue));
    return [
      { field: 'supplier', headerName: 'Supplier' },
      {
        field: 'revenue',
        headerName: 'Revenue',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxRevenue),
      },
      {
        field: 'gp',
        headerName: 'GP',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => ({ color: (p.value ?? 0) < 0 ? NEGATIVE : 'var(--text)' }),
      },
      {
        field: 'marginPct',
        headerName: 'Margin %',
        valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}%`,
        cellStyle: (p) => ({ color: (p.value ?? 0) < 0 ? NEGATIVE : 'var(--text)' }),
      },
    ];
  }, [bestMarginSuppliers.bottom]);

  const divisionBuyColumns: ColDef<DivisionBuyChartRow>[] = useMemo(() => {
    const maxGrn = Math.max(1, ...divisionBuyTableRows.map((r) => r.grnQty));
    const maxSold = Math.max(1, ...divisionBuyTableRows.map((r) => r.unitsSold));
    return [
      { field: 'division', headerName: 'Division' },
      {
        field: 'grnQty',
        headerName: 'Goods Received',
        valueFormatter: (p) => num.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxGrn),
      },
      {
        field: 'unitsSold',
        headerName: 'Units Sold',
        valueFormatter: (p) => num.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxSold),
      },
      {
        field: 'sellThroughRatio',
        headerName: 'Sell-Through Ratio',
        valueFormatter: (p) => `${(p.value ?? 0).toFixed(2)}%`,
        cellStyle: (p) => ({ color: (p.value ?? 0) < 2 ? NEGATIVE : 'var(--text)' }),
      },
    ];
  }, [divisionBuyTableRows]);

  const overBuyingColumns: ColDef<OverBuyRow>[] = useMemo(() => {
    const maxGrn = Math.max(1, ...overBuyingSuppliers.map((r) => r.grnQty));
    return [
      { field: 'supplier', headerName: 'Supplier' },
      {
        field: 'grnQty',
        headerName: 'Received',
        valueFormatter: (p) => num.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxGrn),
      },
      { field: 'unitsSold', headerName: 'Sold', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'sellThroughRatio',
        headerName: 'Sell-Through',
        valueFormatter: (p) => `${((p.value ?? 0) * 100).toFixed(2)}%`,
        cellStyle: () => ({ color: NEGATIVE }),
      },
    ];
  }, [overBuyingSuppliers]);

  const underBuyingColumns: ColDef<UnderBuyRow>[] = useMemo(() => {
    const maxSold = Math.max(1, ...underBuyingSuppliers.map((r) => r.unitsSold));
    return [
      { field: 'supplier', headerName: 'Supplier' },
      {
        field: 'unitsSold',
        headerName: 'Units Sold',
        valueFormatter: (p) => num.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxSold),
      },
      { field: 'storeClosingQty', headerName: 'Store Stock', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'daysOfCover',
        headerName: 'Days of Cover',
        valueFormatter: (p) => `${(p.value ?? 0).toFixed(1)}d`,
        cellStyle: () => ({ color: NEGATIVE }),
      },
    ];
  }, [underBuyingSuppliers]);

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }
  if (loadingInit) {
    return <p className="muted">Loading buying &amp; supplier dashboard…</p>;
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
        <p className="muted small" style={{ width: '100%', margin: 0 }}>
          {loadingData
            ? 'Loading — supplier-level analysis scans the full item master and can take up to a minute…'
            : 'Revenue, margin, and sell-through are from the 3 M Baazar retail stores. Goods receipts are only recorded at the central warehouse, which supplies more than just these 3 stores — treat receipt-vs-sales comparisons as relative signals across divisions/suppliers, not a literal per-store buy/sell match.'}
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="chart-grid">
        <Card
          title={`Best-Margin Suppliers — ${monthLabel(selectedMonth)}`}
          subtitle={`Top 10 by margin %. Minimum ₹${num.format(MIN_SUPPLIER_REVENUE)} revenue to avoid tiny-sample noise.`}
        >
          {loadingSupplier ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={bestMarginSuppliers.top}
              columnDefs={bestMarginColumns}
              fileName={`best-margin-suppliers-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, bestMarginSuppliers.top.length * 42 + 56)}
              emptyMessage="No suppliers meet the revenue threshold."
            />
          )}
        </Card>

        <Card
          title={`Worst-Margin Suppliers — ${monthLabel(selectedMonth)}`}
          subtitle="Bottom 10 by margin %, same revenue threshold."
        >
          {loadingSupplier ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={bestMarginSuppliers.bottom}
              columnDefs={worstMarginColumns}
              fileName={`worst-margin-suppliers-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, bestMarginSuppliers.bottom.length * 42 + 56)}
              emptyMessage="No suppliers meet the revenue threshold."
            />
          )}
        </Card>
      </div>

      <Card
        title={`Over/Under Buying by Division — ${monthLabel(selectedMonth)}`}
        subtitle="Warehouse goods received vs. units sold across the 3 stores. Sell-through ratio is a relative comparison across divisions, not a literal fulfillment rate (the warehouse supplies more than these 3 stores)."
      >
        {loadingDivision ? (
          <SkeletonChart height={280} />
        ) : divisionBuyChart.length === 0 ? (
          <div className="muted">No receipt data for the selected month.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={divisionBuyChart} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="division" angle={-30} textAnchor="end" interval={0} height={80} />
              <YAxis yAxisId="left" tickFormatter={(v: number) => num.format(v)} width={80} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => num.format(v)} width={70} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} formatter={(v: number) => num.format(v)} />
              <Legend wrapperStyle={legendStyle} />
              <Bar yAxisId="left" dataKey="grnQty" name="Goods Received (Warehouse)" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="unitsSold" name="Units Sold (Stores)" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: 16 }}>
          {loadingDivision ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={divisionBuyTableRows}
              columnDefs={divisionBuyColumns}
              fileName={`division-buy-sell-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, divisionBuyTableRows.length * 42 + 56)}
              emptyMessage="No receipt data for the selected month."
            />
          )}
        </div>
      </Card>

      <div className="chart-grid">
        <Card
          title={`Over-Buying Candidates — ${monthLabel(selectedMonth)}`}
          subtitle="Suppliers with large warehouse receipts (≥5,000 units) but the weakest sell-through ratio into the 3 stores."
        >
          {loadingSupplier ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={overBuyingSuppliers}
              columnDefs={overBuyingColumns}
              fileName={`over-buying-candidates-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, overBuyingSuppliers.length * 42 + 56)}
              emptyMessage="No over-buying candidates found."
            />
          )}
        </Card>

        <Card
          title={`Under-Buying Candidates — ${monthLabel(selectedMonth)}`}
          subtitle="Suppliers selling well (≥20 units) with fewer than 14 days of store stock cover — possible replenishment gap."
        >
          {loadingSupplier ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={underBuyingSuppliers}
              columnDefs={underBuyingColumns}
              fileName={`under-buying-candidates-${selectedMonth}`}
              pagination={false}
              height={Math.max(160, underBuyingSuppliers.length * 42 + 56)}
              emptyMessage="No under-buying candidates found."
            />
          )}
        </Card>
      </div>

      <Card
        title={`Supplier Concentration — Top 10 by Revenue — ${monthLabel(selectedMonth)}`}
        subtitle={`Top 10 suppliers account for ${supplierConcentration.top10SharePct.toFixed(1)}% of store revenue in the selected month.`}
      >
        {loadingSupplier || loadingTotal ? (
          <SkeletonChart height={320} />
        ) : supplierConcentration.top10.length === 0 ? (
          <div className="muted">No supplier revenue data for the selected month.</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={supplierConcentration.top10} layout="vertical" margin={{ left: 200 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <YAxis type="category" dataKey="supplier" width={220} interval={0} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--muted)' }}
                formatter={(v: number, _name: string, item: any) => [`${v.toFixed(1)}% (${formatCompact(item?.payload?.revenue ?? 0)})`, 'Revenue Share']}
              />
              <Bar dataKey="sharePct" name="Revenue Share" radius={[0, 4, 4, 0]}>
                {supplierConcentration.top10.map((_r, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <p className="muted small">
        Late vendors / overdue POs need PO &amp; GRN documents with dates — not available; pending_po_quantity is a
        warehouse quantity snapshot only.
      </p>
    </div>
  );
}

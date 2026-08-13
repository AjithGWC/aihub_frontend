import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  selectStyle,
  filterLabelStyle,
  Card,
  DataGrid,
  SkeletonKpiValue,
  SkeletonChart,
  SkeletonTable,
  heatStyle,
  deltaCellStyle,
} from './_shared/dashboardKit';

// The "current position" month (June 2026), the all-sites scope and the
// transfer peer set (warehouse excluded — it's a supply source, not a peer)
// are all fixed in the tile manifest SQL.
const EXCESS_DAYS_THRESHOLD = 120;
const CHART_COVER_CAP = 1500;

interface SiteOption {
  code: number;
  name: string;
}
interface DivisionCoverRow extends Row {
  division: string;
  daysOfCover: number | null;
  closingQty: number;
  closingValue: number;
}
interface DeadStockRow extends Row {
  sku: string;
  article: string;
  division: string;
  closingQty: number;
  closingValue: number;
}
interface ExcessRow extends Row {
  sku: string;
  article: string;
  division: string;
  closingQty: number;
  closingValue: number;
  unitsSold: number;
  daysOfCover: number;
}
interface TransferRow extends Row {
  article: string;
  division: string;
  fromSite: string;
  fromQty: number;
  fromCover: number | null;
  toSite: string;
  toQty: number;
  toUnits: number;
  toCover: number;
}

export default function InventoryHealth() {
  const [selectedSite, setSelectedSite] = useState<string>('');

  // Data arrives per tile over an NDJSON stream — no SQL in the frontend.
  // site = 0 means "all sites"; rollup measures are already sign-corrected
  // (units/revenue positive), so nothing is negated here.
  const { tiles, status, errors, fatalError, isLoading } = useDashboardTiles('inventory-health', {
    site: selectedSite === '' ? 0 : Number(selectedSite),
  });

  // Each section shows its own skeleton until its tile lands.
  const settled = (id: string) => status[id] === 'ready' || status[id] === 'error';
  const loadingTotals = !settled('totals');
  const loadingCover = !settled('division-cover');
  const loadingDeadKpi = !settled('dead-stock-kpi');
  const loadingDead = !settled('dead-stock');
  const loadingExcess = !settled('excess-stock');
  const loadingTransfers = !settled('transfer-opportunities');

  const error =
    errors['sites'] ||
    errors['totals'] ||
    errors['division-cover'] ||
    errors['dead-stock-kpi'] ||
    errors['dead-stock'] ||
    errors['excess-stock'] ||
    null;
  const transferError = errors['transfer-opportunities'] ?? null;

  // The site list drives a filter, so it is kept in state: changing a param
  // restarts the stream and momentarily clears `tiles`.
  const [sites, setSites] = useState<SiteOption[]>([]);
  useEffect(() => {
    const rows = tiles['sites']?.rows as Row[] | undefined;
    if (rows?.length) setSites(rows.map((r) => ({ code: n(r.admsite_code), name: s(r.site_name) })));
  }, [tiles]);
  const loadingSites = sites.length === 0 && status['sites'] !== 'error';

  const totals = useMemo(() => {
    const row = tiles['totals']?.rows?.[0] as Row | undefined;
    return { totalValue: n(row?.total_value), totalUnits: n(row?.total_units) };
  }, [tiles]);
  const totalValue = totals.totalValue;
  const totalUnits = totals.totalUnits;

  const deadKpi = useMemo(() => {
    const row = tiles['dead-stock-kpi']?.rows?.[0] as Row | undefined;
    const totalSkus = n(row?.total_skus);
    const deadSkuCount = n(row?.dead_sku_count);
    return {
      deadValueKpi: n(row?.dead_value),
      deadPctOfSkus: totalSkus > 0 ? (deadSkuCount / totalSkus) * 100 : 0,
    };
  }, [tiles]);
  const deadValueKpi = deadKpi.deadValueKpi;
  const deadPctOfSkus = deadKpi.deadPctOfSkus;

  const divisionCover: DivisionCoverRow[] = useMemo(
    () =>
      ((tiles['division-cover']?.rows ?? []) as Row[]).map((r) => ({
        division: s(r.division),
        daysOfCover: r.days_of_cover == null ? null : n(r.days_of_cover),
        closingQty: n(r.closing_qty),
        closingValue: n(r.closing_value),
      })),
    [tiles]
  );

  const deadStockRows: DeadStockRow[] = useMemo(
    () =>
      ((tiles['dead-stock']?.rows ?? []) as Row[]).map((r) => ({
        sku: s(r.sku),
        article: s(r.article),
        division: s(r.division),
        closingQty: n(r.june_closing_qty),
        closingValue: n(r.june_closing_value),
      })),
    [tiles]
  );

  const excessRows: ExcessRow[] = useMemo(
    () =>
      ((tiles['excess-stock']?.rows ?? []) as Row[]).map((r) => ({
        sku: s(r.sku),
        article: s(r.article),
        division: s(r.division),
        closingQty: n(r.closing_qty),
        closingValue: n(r.closing_value),
        unitsSold: n(r.units_sold),
        daysOfCover: n(r.days_of_cover),
      })),
    [tiles]
  );

  // Cross-store transfer analysis is fixed to the 3 retail stores + June in the
  // manifest, so it is independent of the site filter above.
  const transferRows: TransferRow[] = useMemo(
    () =>
      ((tiles['transfer-opportunities']?.rows ?? []) as Row[]).map((r) => ({
        article: s(r.article),
        division: s(r.division),
        fromSite: s(r.from_site),
        fromQty: n(r.from_qty),
        fromCover: r.from_cover == null ? null : n(r.from_cover),
        toSite: s(r.to_site),
        toQty: n(r.to_qty),
        toUnits: n(r.to_units),
        toCover: n(r.to_cover),
      })),
    [tiles]
  );

  const chartableCover = useMemo(
    () =>
      divisionCover
        .filter((r) => r.daysOfCover != null)
        .map((r) => ({ ...r, chartValue: Math.min(r.daysOfCover as number, CHART_COVER_CAP) })),
    [divisionCover]
  );

  const sortedDivisionCover = useMemo(
    () => divisionCover.slice().sort((a, b) => (b.daysOfCover ?? Infinity) - (a.daysOfCover ?? Infinity)),
    [divisionCover]
  );

  const divisionCoverColumns: ColDef<DivisionCoverRow>[] = useMemo(() => {
    const maxValue = Math.max(1, ...sortedDivisionCover.map((r) => r.closingValue));
    return [
      { field: 'division', headerName: 'Division' },
      {
        field: 'daysOfCover',
        headerName: 'Days of Cover',
        valueFormatter: (p) => (p.value == null ? 'No sales (dead)' : `${p.value.toFixed(0)}d`),
        cellStyle: (p) => (p.value != null && p.value > EXCESS_DAYS_THRESHOLD ? deltaCellStyle(-1) : undefined),
      },
      { field: 'closingQty', headerName: 'Closing Qty', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'closingValue',
        headerName: 'Closing Value',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxValue),
      },
    ];
  }, [sortedDivisionCover]);

  const deadStockColumns: ColDef<DeadStockRow>[] = useMemo(() => {
    const maxValue = Math.max(1, ...deadStockRows.map((r) => r.closingValue));
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
  }, [deadStockRows]);

  const excessColumns: ColDef<ExcessRow>[] = useMemo(() => {
    const maxValue = Math.max(1, ...excessRows.map((r) => r.closingValue));
    return [
      { field: 'article', headerName: 'Article' },
      { field: 'division', headerName: 'Division' },
      { field: 'closingQty', headerName: 'Closing Qty', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'closingValue',
        headerName: 'Closing Value',
        valueFormatter: (p) => inr.format(p.value ?? 0),
        cellStyle: (p) => heatStyle(p.value ?? 0, maxValue),
      },
      { field: 'unitsSold', headerName: 'Units Sold (Jun)', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'daysOfCover',
        headerName: 'Days of Cover',
        valueFormatter: (p) => `${(p.value ?? 0).toFixed(0)}d`,
        cellStyle: () => ({ color: NEGATIVE, fontWeight: 600 }),
      },
    ];
  }, [excessRows]);

  const transferColumns: ColDef<TransferRow>[] = useMemo(
    () => [
      { field: 'article', headerName: 'Article' },
      { field: 'division', headerName: 'Division' },
      {
        field: 'fromSite',
        headerName: 'From (over-covered)',
        valueFormatter: (p) => `${p.value}${p.data?.fromCover != null ? ` (${p.data.fromCover.toFixed(0)}d cover)` : ' (no sales)'}`,
      },
      { field: 'fromQty', headerName: 'From Qty', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        field: 'toSite',
        headerName: 'To (low cover / selling)',
        valueFormatter: (p) => `${p.value}${p.data?.toQty === 0 ? ' (out of stock)' : ` (${(p.data?.toCover ?? 0).toFixed(1)}d cover)`}`,
      },
      { field: 'toQty', headerName: 'To Qty', valueFormatter: (p) => num.format(p.value ?? 0) },
      {
        headerName: 'Suggested Direction',
        valueGetter: (p) => `${p.data?.fromSite} → ${p.data?.toSite}`,
      },
    ],
    []
  );

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }
  if (loadingSites) {
    return <p className="muted">Loading inventory health dashboard…</p>;
  }
  if (sites.length === 0) {
    return <p className="muted">No site data available yet.</p>;
  }

  return (
    <div>
      <div className="chart-card" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={filterLabelStyle}>
          Site
          <select style={selectStyle} value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.code} value={site.code}>
                {site.name}
                {site.code === 1070 ? ' (Warehouse)' : ''}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small" style={{ margin: 0 }}>
          Current position uses June 2026 closing stock. {isLoading && 'Recomputing for the selected site — large scopes (especially "All Sites" and the warehouse) can take up to a minute…'}
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Total Closing Stock Value</div>
          {loadingTotals ? <SkeletonKpiValue /> : <div className="kpi-value">{formatCompact(totalValue)}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Closing Units</div>
          {loadingTotals ? <SkeletonKpiValue /> : <div className="kpi-value">{num.format(totalUnits)}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Dead-Stock Value (90-day)</div>
          {loadingDeadKpi ? <SkeletonKpiValue /> : (
            <div className="kpi-value" style={{ color: NEGATIVE }}>{formatCompact(deadValueKpi)}</div>
          )}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">% of SKUs that are Dead Stock</div>
          {loadingDeadKpi ? <SkeletonKpiValue /> : (
            <div className="kpi-value" style={{ color: NEGATIVE }}>{`${deadPctOfSkus.toFixed(1)}%`}</div>
          )}
        </div>
      </div>

      <Card
        title="Days of Cover by Division"
        subtitle={`Days of cover = June closing quantity ÷ (units sold ÷ 30). Divisions with zero sales in June are excluded from the chart (shown as dead stock below) — bars are capped at ${CHART_COVER_CAP}d for scale; exact values are in the table.`}
      >
        {loadingCover ? (
          <SkeletonChart height={300} />
        ) : chartableCover.length === 0 ? (
          <div className="muted">No sell-through data available for the selected scope.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartableCover} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="division" angle={-30} textAnchor="end" interval={0} height={80} />
              <YAxis tickFormatter={(v: number) => `${v}d`} width={60} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--muted)' }}
                formatter={(_v: number, _name: string, item: any) => [`${(item?.payload?.daysOfCover ?? 0).toFixed(0)}d`, 'Days of Cover']}
              />
              <Bar dataKey="chartValue" name="Days of Cover" radius={[4, 4, 0, 0]} fill={CHART_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: 16 }}>
          {loadingCover ? (
            <SkeletonTable />
          ) : (
            <DataGrid
              rowData={sortedDivisionCover}
              columnDefs={divisionCoverColumns}
              fileName={`days-of-cover-${selectedSite || 'all-sites'}`}
              pagination={false}
              height={Math.max(160, sortedDivisionCover.length * 42 + 56)}
              emptyMessage="No division data for the selected scope."
            />
          )}
        </div>
      </Card>

      <Card
        title="90-Day Dead Stock"
        subtitle={`Items with zero units sold across Apr, May & Jun 2026 but positive June closing stock. Top 50 by value — total dead-stock value for the selected scope is ${loadingDeadKpi ? '…' : formatCompact(deadValueKpi)}.`}
      >
        {loadingDead ? (
          <SkeletonTable />
        ) : (
          <DataGrid
            rowData={deadStockRows}
            columnDefs={deadStockColumns}
            fileName={`dead-stock-${selectedSite || 'all-sites'}`}
            emptyMessage="No dead stock found for the selected scope."
          />
        )}
      </Card>

      <Card
        title={`Excess Inventory — Cover Above ${EXCESS_DAYS_THRESHOLD} Days`}
        subtitle={`Items that are still selling (units sold > 0 in June) but carry more than ${EXCESS_DAYS_THRESHOLD} days of cover at the current sell rate. Zero-sale items are dead stock (above), not excess. Top 50 by closing value.`}
      >
        {loadingExcess ? (
          <SkeletonTable />
        ) : (
          <DataGrid
            rowData={excessRows}
            columnDefs={excessColumns}
            fileName={`excess-inventory-${selectedSite || 'all-sites'}`}
            emptyMessage="No excess inventory found above the threshold for the selected scope."
          />
        )}
      </Card>

      <Card
        title="Store Transfer Opportunities"
        subtitle="Same barcode, over-covered at one store and near-stockout or selling well at another — a candidate for a store-to-store transfer instead of a fresh purchase order. Scoped to the 3 retail stores only (warehouse is a supply source, not a transfer peer) and computed independently of the site filter above. Top 50 by from-store quantity."
      >
        {transferError && <div className="error-box">{transferError}</div>}
        {loadingTransfers ? (
          <>
            <p className="muted small">Computing cross-store matches — this can take up to a minute…</p>
            <SkeletonTable />
          </>
        ) : (
          <DataGrid
            rowData={transferRows}
            columnDefs={transferColumns}
            fileName="store-transfer-opportunities"
            emptyMessage="No transfer opportunities found."
          />
        )}
      </Card>

      <p className="muted small">
        7-day stockout risk needs daily stock data — this dashboard uses monthly closing snapshots, so short-horizon
        stockout timing cannot be shown here.
      </p>
    </div>
  );
}

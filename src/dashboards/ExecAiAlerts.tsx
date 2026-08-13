import { useMemo } from 'react';
import type { ColDef } from 'ag-grid-community';
import { useDashboardTiles } from '../hooks/useDashboardTiles';
import {
  Row,
  n,
  s,
  num,
  formatCompact,
  NEGATIVE,
  POSITIVE,
  Card,
  DataGrid,
  SkeletonKpiValue,
  SkeletonTable,
} from './_shared/dashboardKit';

// Store filtering (warehouse 1070 excluded) and the top-50 article cut now live
// in the tile manifest SQL — see backend/data/tiles/exec-ai-alerts.json.
const LOW_SELL_THROUGH_PCT = 20;
const LOW_COVER_DAYS = 15;

function monthKey(d: unknown): string {
  return String(d).slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function shortSite(name: string): string {
  return name.replace('M Baazar - ', '');
}
function formatPct(pct: number | null): string {
  if (pct == null) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

interface SiteDivisionRow {
  site: string;
  division: string;
  revenue: number;
  gp: number;
}
interface SiteDivisionMonthRow extends SiteDivisionRow {
  month: string;
}
interface SellThroughRow {
  division: string;
  month: string;
  pct: number | null;
}
interface TopArticleRow {
  article: string;
  division: string;
  revenue: number;
  units: number;
  gp: number;
  closingQty: number;
  daysOfCover: number | null;
  cumulativePct: number;
}
interface TransferRow {
  article: string;
  division: string;
  fromSite: string;
  fromQty: number;
  fromCover: number | null;
  toSite: string;
  toQty: number;
  toCover: number;
}
interface Driver {
  key: string;
  site: string;
  division: string;
  delta: number;
  pctDelta: number | null;
}
interface AlertRow extends Row {
  type: string;
  detail: string;
  metric: string;
  achievable: boolean;
}
interface ActionRow extends Row {
  rank: number;
  category: string;
  sentence: string;
  magnitude: string;
}

export default function ExecAiAlerts() {
  // Data arrives per tile over an NDJSON stream — no SQL in the frontend.
  // Rollup measures are already sign-corrected (revenue/units positive).
  const { tiles, status, errors, fatalError, isLoading } = useDashboardTiles('exec-ai-alerts');

  // One flag per tile so each section paints as soon as its own query lands.
  const loading = status['months'] !== 'ready' && status['months'] !== 'error';
  const loadingDrivers = status['site-division-month'] !== 'ready' && status['site-division-month'] !== 'error';
  const loadingSellThrough = status['sell-through'] !== 'ready' && status['sell-through'] !== 'error';
  const loadingDeadTotal = status['dead-stock-total'] !== 'ready' && status['dead-stock-total'] !== 'error';
  const loadingDeadDetail = status['dead-stock-detail'] !== 'ready' && status['dead-stock-detail'] !== 'error';
  const loadingTopArticles = status['top-articles'] !== 'ready' && status['top-articles'] !== 'error';
  const loadingTransfer = status['transfer-opportunities'] !== 'ready' && status['transfer-opportunities'] !== 'error';
  const loadingTotalRevenue = status['total-revenue'] !== 'ready' && status['total-revenue'] !== 'error';
  const loadingConcentration = loadingDrivers || loadingTotalRevenue;
  const loadingActions = loadingDeadDetail || loadingDrivers || loadingTransfer || loadingSellThrough || loadingTopArticles;
  const loadingAlerts = loadingSellThrough || loadingDeadDetail || loadingTopArticles;

  const error =
    errors['months'] ||
    errors['site-division-month'] ||
    errors['sell-through'] ||
    errors['dead-stock-total'] ||
    errors['dead-stock-detail'] ||
    errors['top-articles'] ||
    errors['transfer-opportunities'] ||
    errors['total-revenue'] ||
    null;

  const months: string[] = useMemo(
    () => ((tiles['months']?.rows ?? []) as Row[]).map((r) => monthKey(r.start_date)),
    [tiles]
  );

  // All 3 months arrive in one tile; latest/prior slices are derived below.
  const siteDivisionAll: SiteDivisionMonthRow[] = useMemo(
    () =>
      ((tiles['site-division-month']?.rows ?? []) as Row[]).map((r) => ({
        site: s(r.site_name),
        division: s(r.division),
        month: monthKey(r.start_date),
        revenue: n(r.revenue),
        gp: n(r.gp),
      })),
    [tiles]
  );

  const sellThroughRows: SellThroughRow[] = useMemo(
    () =>
      ((tiles['sell-through']?.rows ?? []) as Row[])
        .map((r) => ({ division: s(r.division), month: monthKey(r.start_date), pct: r.sell_through_pct == null ? null : n(r.sell_through_pct) }))
        .filter((r) => r.pct != null),
    [tiles]
  );

  const deadStockTotal = useMemo(
    () => n((((tiles['dead-stock-total']?.rows ?? []) as Row[])[0] as Row | undefined)?.dead_value),
    [tiles]
  );

  const deadStockDetail = useMemo(
    () =>
      ((tiles['dead-stock-detail']?.rows ?? []) as Row[]).map((r) => ({
        article: s(r.article),
        division: s(r.division),
        closingQty: n(r.latest_closing_qty),
        closingValue: n(r.latest_closing_value),
      })),
    [tiles]
  );

  const topArticlesRaw = useMemo(
    () =>
      ((tiles['top-articles']?.rows ?? []) as Row[]).map((r) => ({
        article: s(r.article),
        division: s(r.division),
        revenue: n(r.revenue),
        units: n(r.units),
        gp: n(r.gp),
        closingQty: n(r.closing_qty),
      })),
    [tiles]
  );

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
        toCover: n(r.to_cover),
      })),
    [tiles]
  );

  const totalRevenue = useMemo(
    () => n((((tiles['total-revenue']?.rows ?? []) as Row[])[0] as Row | undefined)?.total_revenue),
    [tiles]
  );

  const latestMonth = months[months.length - 1] ?? '';
  const priorMonth = months[months.length - 2] ?? '';

  const siteDivisionLatest = useMemo(() => siteDivisionAll.filter((r) => r.month === latestMonth), [siteDivisionAll, latestMonth]);
  const siteDivisionPrior = useMemo(() => siteDivisionAll.filter((r) => r.month === priorMonth), [siteDivisionAll, priorMonth]);

  const drivers = useMemo(() => {
    const priorMap = new Map(siteDivisionPrior.map((r) => [`${r.site}||${r.division}`, r]));
    const latestMap = new Map(siteDivisionLatest.map((r) => [`${r.site}||${r.division}`, r]));
    const keys = new Set([...priorMap.keys(), ...latestMap.keys()]);
    const list: Driver[] = [];
    for (const key of keys) {
      const [site, division] = key.split('||');
      const prior = priorMap.get(key);
      const latest = latestMap.get(key);
      const priorRev = prior?.revenue ?? 0;
      const latestRev = latest?.revenue ?? 0;
      const delta = latestRev - priorRev;
      const pctDelta = priorRev !== 0 ? (delta / priorRev) * 100 : null;
      list.push({ key, site, division, delta, pctDelta });
    }
    const sorted = list.slice().sort((a, b) => b.delta - a.delta);
    return { positive: sorted.slice(0, 3), negative: sorted.slice(-3).reverse() };
  }, [siteDivisionPrior, siteDivisionLatest]);

  const marginDrop = useMemo(() => {
    function marginByKey(rows: SiteDivisionRow[], keyFn: (r: SiteDivisionRow) => string) {
      const map = new Map<string, { revenue: number; gp: number }>();
      for (const r of rows) {
        const k = keyFn(r);
        const e = map.get(k) ?? { revenue: 0, gp: 0 };
        e.revenue += r.revenue;
        e.gp += r.gp;
        map.set(k, e);
      }
      return map;
    }
    const priorByDivision = marginByKey(siteDivisionPrior, (r) => r.division);
    const latestByDivision = marginByKey(siteDivisionLatest, (r) => r.division);
    const priorBySite = marginByKey(siteDivisionPrior, (r) => r.site);
    const latestBySite = marginByKey(siteDivisionLatest, (r) => r.site);

    function worstDrop(priorMap: Map<string, { revenue: number; gp: number }>, latestMap: Map<string, { revenue: number; gp: number }>, level: string) {
      let worst: { name: string; level: string; priorMargin: number; latestMargin: number; delta: number } | null = null;
      for (const [name, latest] of latestMap.entries()) {
        const prior = priorMap.get(name);
        if (!prior || prior.revenue === 0 || latest.revenue === 0) continue;
        const priorMargin = (prior.gp / prior.revenue) * 100;
        const latestMargin = (latest.gp / latest.revenue) * 100;
        const delta = latestMargin - priorMargin;
        if (!worst || delta < worst.delta) worst = { name, level, priorMargin, latestMargin, delta };
      }
      return worst;
    }
    const divisionWorst = worstDrop(priorByDivision, latestByDivision, 'division');
    const siteWorst = worstDrop(priorBySite, latestBySite, 'store');
    const candidates = [divisionWorst, siteWorst].filter((c): c is NonNullable<typeof c> => c != null);
    candidates.sort((a, b) => a.delta - b.delta);
    return candidates[0] ?? null;
  }, [siteDivisionPrior, siteDivisionLatest]);

  const weakestSellThrough = useMemo(() => {
    const latestRows = sellThroughRows.filter((r) => r.month === latestMonth && r.pct != null);
    if (latestRows.length === 0) return null;
    return latestRows.slice().sort((a, b) => (a.pct as number) - (b.pct as number))[0];
  }, [sellThroughRows, latestMonth]);

  const topArticles: TopArticleRow[] = useMemo(() => {
    let cum = 0;
    return topArticlesRaw.map((r) => {
      cum += r.revenue;
      const daysOfCover = r.units > 0 ? r.closingQty / (r.units / 30) : null;
      return {
        ...r,
        daysOfCover,
        cumulativePct: totalRevenue > 0 ? (cum / totalRevenue) * 100 : 0,
      };
    });
  }, [topArticlesRaw, totalRevenue]);

  const thinnestCoverTopArticle = useMemo(() => {
    const withCover = topArticles.filter((a) => a.daysOfCover != null);
    if (withCover.length === 0) return null;
    return withCover.slice().sort((a, b) => (a.daysOfCover as number) - (b.daysOfCover as number))[0];
  }, [topArticles]);

  const topSkusLowCoverCount = useMemo(
    () => topArticles.filter((a) => a.daysOfCover != null && (a.daysOfCover as number) < LOW_COVER_DAYS).length,
    [topArticles]
  );

  const concentration = useMemo(() => {
    const bySite = new Map<string, number>();
    const byDivision = new Map<string, number>();
    for (const r of siteDivisionLatest) {
      bySite.set(r.site, (bySite.get(r.site) ?? 0) + r.revenue);
      byDivision.set(r.division, (byDivision.get(r.division) ?? 0) + r.revenue);
    }
    const topSiteRevenue = Math.max(0, ...Array.from(bySite.values()));
    const topDivisionRevenue = Math.max(0, ...Array.from(byDivision.values()));
    return {
      topStorePct: totalRevenue > 0 ? (topSiteRevenue / totalRevenue) * 100 : 0,
      topDivisionPct: totalRevenue > 0 ? (topDivisionRevenue / totalRevenue) * 100 : 0,
    };
  }, [siteDivisionLatest, totalRevenue]);

  const biggestTransfer = transferRows[0] ?? null;

  const actions: ActionRow[] = useMemo(() => {
    const list: { category: string; sentence: string; magnitude: string }[] = [];
    const topDead = deadStockDetail[0];
    if (topDead) {
      list.push({
        category: 'Largest dead-stock value',
        sentence: `"${topDead.article}" (${topDead.division}) has ${num.format(topDead.closingQty)} units sitting dead — no sales in 3 months.`,
        magnitude: formatCompact(topDead.closingValue),
      });
    }
    if (marginDrop) {
      list.push({
        category: 'Sharpest margin drop',
        sentence: `Margin fell sharply in ${marginDrop.name} (${marginDrop.level}): ${marginDrop.priorMargin.toFixed(1)}% → ${marginDrop.latestMargin.toFixed(1)}%.`,
        magnitude: `${marginDrop.delta.toFixed(1)}pt`,
      });
    }
    if (biggestTransfer) {
      list.push({
        category: 'Biggest transfer opportunity',
        sentence: `Transfer "${biggestTransfer.article}" from ${shortSite(biggestTransfer.fromSite)} (${num.format(biggestTransfer.fromQty)} units${biggestTransfer.fromCover != null ? `, ${biggestTransfer.fromCover.toFixed(0)}d cover` : ', no sales'}) to ${shortSite(biggestTransfer.toSite)} (${biggestTransfer.toQty === 0 ? 'out of stock' : `${biggestTransfer.toCover.toFixed(1)}d cover`}).`,
        magnitude: `${num.format(biggestTransfer.fromQty)} units`,
      });
    }
    if (weakestSellThrough) {
      list.push({
        category: 'Weakest sell-through category',
        sentence: `${weakestSellThrough.division} sell-through is only ${(weakestSellThrough.pct as number).toFixed(1)}% in ${monthLabel(latestMonth)} — the weakest of all divisions.`,
        magnitude: `${(weakestSellThrough.pct as number).toFixed(1)}%`,
      });
    }
    if (thinnestCoverTopArticle) {
      list.push({
        category: 'Thinnest cover on a top-revenue SKU',
        sentence: `"${thinnestCoverTopArticle.article}" (${thinnestCoverTopArticle.division}) is a top-${Math.round(thinnestCoverTopArticle.cumulativePct)}% revenue driver but has only ${(thinnestCoverTopArticle.daysOfCover as number).toFixed(1)} days of cover.`,
        magnitude: `${(thinnestCoverTopArticle.daysOfCover as number).toFixed(1)}d`,
      });
    }
    return list.map((a, i) => ({ rank: i + 1, ...a }));
  }, [deadStockDetail, marginDrop, biggestTransfer, weakestSellThrough, thinnestCoverTopArticle, latestMonth]);

  const alerts: AlertRow[] = useMemo(() => {
    const rows: AlertRow[] = [];
    for (const r of sellThroughRows.filter((r) => r.month === latestMonth && r.pct != null && (r.pct as number) < LOW_SELL_THROUGH_PCT)) {
      rows.push({ type: 'Low Sell-Through', detail: r.division, metric: `${(r.pct as number).toFixed(1)}%`, achievable: true });
    }
    for (const d of deadStockDetail) {
      rows.push({ type: 'Dead Stock', detail: `${d.article} (${d.division})`, metric: formatCompact(d.closingValue), achievable: true });
    }
    for (const a of topArticles.filter((a) => a.daysOfCover != null && (a.daysOfCover as number) < LOW_COVER_DAYS)) {
      rows.push({ type: 'Top-SKU Low Cover', detail: `${a.article} (${a.division})`, metric: `${(a.daysOfCover as number).toFixed(1)}d`, achievable: true });
    }
    rows.push({ type: 'Target Miss', detail: 'Requires a target/budget table — not available in this dataset.', metric: '—', achievable: false });
    rows.push({ type: 'Vendor Delay', detail: 'Requires PO & GRN documents with dates — not available; only a warehouse quantity snapshot exists.', metric: '—', achievable: false });
    rows.push({ type: 'Customer Churn', detail: 'Requires customer-level transaction history — not available (this data is store/SKU level, no customer dimension).', metric: '—', achievable: false });
    return rows;
  }, [sellThroughRows, deadStockDetail, topArticles, latestMonth]);

  const actionColumns: ColDef<ActionRow>[] = useMemo(
    () => [
      { field: 'rank', headerName: '#', maxWidth: 70, flex: 0 },
      { field: 'category', headerName: 'Category' },
      { field: 'sentence', headerName: 'Action', flex: 3, minWidth: 280, wrapText: true, autoHeight: true },
      {
        field: 'magnitude',
        headerName: 'Magnitude',
        cellStyle: () => ({ color: NEGATIVE, fontWeight: 600, whiteSpace: 'nowrap' }),
      },
    ],
    []
  );

  const alertColumns: ColDef<AlertRow>[] = useMemo(
    () => [
      {
        field: 'type',
        headerName: 'Type',
        cellStyle: (p) => ({ color: p.data?.achievable ? 'var(--text)' : 'var(--muted)' }),
        valueFormatter: (p) => (p.data && !p.data.achievable ? `${p.value} (requires additional data)` : s(p.value)),
      },
      {
        field: 'detail',
        headerName: 'Detail',
        flex: 2,
        minWidth: 260,
        wrapText: true,
        autoHeight: true,
        cellStyle: (p) => ({ color: p.data?.achievable ? 'var(--text)' : 'var(--muted)' }),
      },
      {
        field: 'metric',
        headerName: 'Metric',
        cellStyle: (p) => ({ color: p.data?.achievable ? 'var(--text)' : 'var(--muted)' }),
      },
    ],
    []
  );

  // Auth / permission / parameter failures mean nothing can render.
  if (fatalError) {
    return <div className="error-box">{fatalError}</div>;
  }
  if (error && months.length < 2 && !loading) {
    return <div className="error-box">{error}</div>;
  }
  if (!loading && months.length < 2) {
    return <p className="muted">At least two months of data are needed to compute month-over-month drivers.</p>;
  }

  return (
    <div>
      {isLoading && (
        <p className="muted">Synthesizing across stores, divisions, SKUs, and suppliers — this can take up to a minute…</p>
      )}
      {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="chart-card">
        <p className="muted small" style={{ margin: 0 }}>
          Rule-based summary — every figure below is computed directly from the client data ({monthLabel(priorMonth)} vs{' '}
          {monthLabel(latestMonth)}, M Baazar retail stores only, warehouse excluded). No external model calls.
        </p>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Dead-Stock Value at Risk</div>
          {loadingDeadTotal ? <SkeletonKpiValue /> : <div className="kpi-value" style={{ color: NEGATIVE }}>{formatCompact(deadStockTotal)}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Revenue Concentration — Top Store</div>
          {loadingConcentration ? <SkeletonKpiValue /> : <div className="kpi-value">{concentration.topStorePct.toFixed(1)}%</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Revenue Concentration — Top Division</div>
          {loadingConcentration ? <SkeletonKpiValue /> : <div className="kpi-value">{concentration.topDivisionPct.toFixed(1)}%</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top-Revenue SKUs Under {LOW_COVER_DAYS}d Cover</div>
          {loadingTopArticles ? (
            <SkeletonKpiValue />
          ) : (
            <div className="kpi-value" style={{ color: topSkusLowCoverCount > 0 ? NEGATIVE : undefined }}>{topSkusLowCoverCount}</div>
          )}
        </div>
      </div>

      <div className="chart-grid">
        <Card title={`Top Positive Drivers — ${latestMonth ? `${monthLabel(latestMonth)} vs ${monthLabel(priorMonth)}` : ''}`}>
          {loadingDrivers ? (
            <SkeletonTable height={140} />
          ) : drivers.positive.length === 0 ? (
            <div className="muted">No positive drivers found.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {drivers.positive.map((d) => (
                <li key={d.key} style={{ marginBottom: 8, color: POSITIVE }}>
                  {d.division} at {shortSite(d.site)} up {formatCompact(Math.abs(d.delta))}
                  {d.pctDelta != null ? `, ${formatPct(d.pctDelta)}` : ''}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Top Negative Drivers — ${latestMonth ? `${monthLabel(latestMonth)} vs ${monthLabel(priorMonth)}` : ''}`}>
          {loadingDrivers ? (
            <SkeletonTable height={140} />
          ) : drivers.negative.length === 0 ? (
            <div className="muted">No negative drivers found.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {drivers.negative.map((d) => (
                <li key={d.key} style={{ marginBottom: 8, color: NEGATIVE }}>
                  {d.division} at {shortSite(d.site)} down {formatCompact(Math.abs(d.delta))}
                  {d.pctDelta != null ? `, ${formatPct(d.pctDelta)}` : ''}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Top 5 Actions Today"
        subtitle="One representative action per category — largest dead-stock value, sharpest margin drop, biggest transfer opportunity, weakest sell-through category, thinnest cover on a top-revenue SKU."
      >
        {loadingActions ? (
          <SkeletonTable height={260} />
        ) : (
          <DataGrid
            rowData={actions}
            columnDefs={actionColumns}
            fileName={`top-5-actions-${latestMonth}`}
            pagination={false}
            height={Math.max(160, actions.length * 56 + 56)}
            emptyMessage="Not enough data to generate actions."
          />
        )}
      </Card>

      <Card
        title="Alerts"
        subtitle="Achievable alerts (low sell-through, dead stock, top-SKU low cover) are computed from the data. Target-miss, vendor-delay, and customer-churn alerts require data not available in this dataset and are marked as such."
      >
        {loadingAlerts ? (
          <SkeletonTable height={320} />
        ) : (
          <DataGrid
            rowData={alerts}
            columnDefs={alertColumns}
            fileName={`alerts-${latestMonth}`}
            pagination={false}
            height={Math.max(160, alerts.length * 56 + 56)}
            emptyMessage="No alerts for the selected period."
          />
        )}
      </Card>
    </div>
  );
}

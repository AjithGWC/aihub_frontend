/**
 * DrillChart — a generic, declarative drill-through chart for AI-generated dashboards.
 *
 * The model is a **stack of drill levels**, not a bar/line toggle. You declare an
 * ordered array of levels; level 0 renders first, clicking a data point pushes the
 * next level onto the stack (carrying the clicked value in a `DrillContext`), and the
 * back button / breadcrumb pops levels off. Any `kind` can drill into any other
 * `kind` — bar → line, pie → bar, line → area, or `kind: 'custom'` for a table leaf.
 *
 * It never fetches anything. Each level's `data` is either an array or a selector
 * `(ctx) => rows` over rows the dashboard already has from `useDashboardTiles`, so
 * drilling costs zero extra queries and stays inside the streaming/cache model.
 *
 * Not a dashboard: `registry.ts` globs only './*.tsx' at the dashboards root, so
 * nothing in `_shared/` is ever picked up as a plugin.
 */
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CHART_COLORS, Card, Row as DrillRow, SkeletonChart, legendStyle, n, num, s, tooltipStyle } from './dashboardKit';

export type { DrillRow };

/** Built-in chart kinds, plus `custom` for a hand-rendered level (table, KPI strip, …). */
export type ChartKind = 'bar' | 'line' | 'area' | 'pie' | 'custom';

export interface DrillSeries {
  /** Row field holding the measure. */
  key: string;
  /** Legend / tooltip label. */
  name: string;
  /** Defaults to CHART_COLORS in declaration order. */
  color?: string;
}

/** One step of the drill path — created when the user clicks a data point. */
export interface DrillCrumb {
  /** Depth of the level that was clicked (0 = root level). */
  depth: number;
  /** `drillKey` of the level that was clicked. */
  key: string;
  /** Value of `drillKey` on the clicked row. */
  value: string;
  /** Human label shown in the breadcrumb (defaults to `value`). */
  label: string;
  /** The whole clicked row, for levels that need more than the key. */
  row: DrillRow;
}

/** What a level's `title` / `data` selectors receive. */
export interface DrillContext {
  /** Index of the level currently being rendered (0 = root). */
  depth: number;
  /** Crumbs from the root down to this level (length === depth). */
  path: readonly DrillCrumb[];
  /** Value of the crumb that opened this level, or null at the root. */
  value: string | null;
  /** Row of the crumb that opened this level, or null at the root. */
  row: DrillRow | null;
  /** Value captured for a given `drillKey` anywhere in the path (multi-level drills). */
  get: (key: string) => string | undefined;
}

interface DrillLevelBase<Row extends DrillRow> {
  /** Card heading. A function receives the drill context, e.g. ctx => `${ctx.value} — trend`. */
  title: string | ((ctx: DrillContext) => string);
  subtitle?: string | ((ctx: DrillContext) => string);
  /** Rows for this level — already loaded, or derived from already-loaded rows. */
  data: Row[] | ((ctx: DrillContext) => Row[]);
  /**
   * Field identifying the clicked item. Present => this level is drillable and a click
   * pushes the next level. Omit it (or return false from `canDrill`) to make a leaf.
   * The LAST level must always be a leaf.
   */
  drillKey?: string;
  /** Block drilling for particular rows (e.g. rows with no children). */
  canDrill?: (row: Row) => boolean;
  /** Breadcrumb label for the crumb this level's click creates. Defaults to the drillKey value. */
  crumbLabel?: (row: Row) => string;
  emptyMessage?: string;
  /** Chart height in px for this level (falls back to the component's `height`). */
  height?: number;
}

interface DrillPlotLevel<Row extends DrillRow> extends DrillLevelBase<Row> {
  kind: Exclude<ChartKind, 'custom'>;
  /** X-axis field (bar/line/area) or slice-name field (pie). */
  categoryKey: string;
  /** One or more measures. Pie uses only the first. */
  series: DrillSeries[];
  /** Formats measures in axis ticks + tooltip. Defaults to en-IN grouping. */
  valueFormatter?: (value: number) => string;
  /** Formats category labels in axis ticks + tooltip (e.g. "2026-06" -> "Jun 2026"). */
  categoryFormatter?: (value: string) => string;
  /** Stack multi-series bars/areas instead of grouping them. */
  stacked?: boolean;
  /** Recharts semantics: 'vertical' means horizontal bars. Bar/line/area only. */
  layout?: 'horizontal' | 'vertical';
}

interface DrillCustomLevel<Row extends DrillRow> extends DrillLevelBase<Row> {
  kind: 'custom';
  /**
   * Render anything (a DataGrid leaf, a KPI strip, a composed chart). `drill` pushes the
   * next level for a row and is a no-op when the level is not drillable.
   */
  render: (rows: Row[], ctx: DrillContext, api: { drill: (row: Row) => void; canDrill: (row: Row) => boolean }) => ReactNode;
}

export type DrillLevel<Row extends DrillRow = DrillRow> = DrillPlotLevel<Row> | DrillCustomLevel<Row>;

/**
 * Declare a level with callbacks typed against YOUR row shape while still producing a
 * level the (row-agnostic) DrillChart can hold in one array.
 *
 * Levels in a drill path almost always have different row shapes (stores → months →
 * divisions), and `DrillLevel<StoreRow>` is not assignable to `DrillLevel<DrillRow>`
 * because `canDrill`/`crumbLabel` take a row as a parameter. Rather than pushing that
 * cast onto every dashboard, it lives here once: rows are plain
 * `Record<string, unknown>` at runtime, so the erasure is sound as long as each level's
 * own `data` really does produce the row shape its own callbacks expect — which the
 * generic argument checks at the call site.
 */
export function drillLevel<Row extends DrillRow>(level: DrillLevel<Row>): DrillLevel<DrillRow> {
  return level as unknown as DrillLevel<DrillRow>;
}

export interface DrillChartProps<Row extends DrillRow = DrillRow> {
  /** Ordered levels, root first. The last one must be a leaf. */
  levels: ReadonlyArray<DrillLevel<Row>>;
  /** True while the underlying tile is still streaming — renders a skeleton. */
  loading?: boolean;
  /** Tile error message — rendered in an `.error-box` instead of the chart. */
  error?: string | null;
  /** Default chart height (per-level `height` wins). */
  height?: number;
  /** Breadcrumb label for the root level. */
  rootLabel?: string;
  /** Change this (e.g. the selected month) to collapse the drill path back to the root. */
  resetKey?: string | number;
  /**
   * Render keyboard-accessible drill buttons under the chart. Chart clicks are
   * mouse-only, so these are the accessible path to the same action. Default true.
   */
  showDrillTargets?: boolean;
  /** Safety cap on how many drill buttons to render. Default 30. */
  maxDrillTargets?: number;
  onDrill?: (crumb: DrillCrumb, path: readonly DrillCrumb[]) => void;
  onBack?: (path: readonly DrillCrumb[]) => void;
  className?: string;
}

/** Minimal shape of the state recharts passes to a chart-level `onClick`. */
interface ChartClickState {
  activeTooltipIndex?: number;
  activeLabel?: string;
}

const resolve = <T,>(value: T | ((ctx: DrillContext) => T), ctx: DrillContext): T =>
  typeof value === 'function' ? (value as (c: DrillContext) => T)(ctx) : value;

export function DrillChart<Row extends DrillRow = DrillRow>({
  levels,
  loading = false,
  error = null,
  height = 300,
  rootLabel = 'All',
  resetKey,
  showDrillTargets = true,
  maxDrillTargets = 30,
  onDrill,
  onBack,
  className,
}: DrillChartProps<Row>) {
  const [path, setPath] = useState<DrillCrumb[]>([]);

  // A filter change invalidates the drill path (the clicked store may not even exist
  // in the new slice), so collapse to the root whenever the caller's key changes.
  // Returning the same array when already at the root keeps this from re-rendering
  // on mount.
  useEffect(() => {
    setPath((prev) => (prev.length === 0 ? prev : []));
  }, [resetKey]);

  // Guard against a shrinking `levels` array (levels are usually derived from data).
  const depth = Math.min(path.length, Math.max(0, levels.length - 1));
  const level = levels[depth] as DrillLevel<Row> | undefined;
  const activePath = useMemo(() => path.slice(0, depth), [path, depth]);

  const ctx: DrillContext = useMemo(() => {
    const last = activePath.length > 0 ? activePath[activePath.length - 1] : null;
    return {
      depth,
      path: activePath,
      value: last ? last.value : null,
      row: last ? last.row : null,
      get: (key: string) => activePath.find((c) => c.key === key)?.value,
    };
  }, [activePath, depth]);

  const rows: Row[] = useMemo(() => {
    if (!level) return [];
    return resolve(level.data, ctx);
  }, [level, ctx]);

  const isDrillable = !!level?.drillKey && depth < levels.length - 1;
  const rowCanDrill = useCallback(
    (row: Row): boolean => {
      if (!isDrillable || !level) return false;
      if (level.canDrill && !level.canDrill(row)) return false;
      return s(row[level.drillKey as string]) !== '';
    },
    [isDrillable, level]
  );

  const drillInto = useCallback(
    (row: Row | undefined) => {
      if (!row || !level || !level.drillKey || !rowCanDrill(row)) return;
      const value = s(row[level.drillKey]);
      const crumb: DrillCrumb = {
        depth,
        key: level.drillKey,
        value,
        label: level.crumbLabel ? level.crumbLabel(row) : value,
        row,
      };
      const next = [...activePath, crumb];
      setPath(next);
      onDrill?.(crumb, next);
    },
    [activePath, depth, level, onDrill, rowCanDrill]
  );

  const drillByIndex = useCallback((index: number) => drillInto(rows[index]), [drillInto, rows]);

  const goToDepth = useCallback(
    (target: number) => {
      const next = activePath.slice(0, target);
      setPath(next);
      onBack?.(next);
    },
    [activePath, onBack]
  );

  const title = level ? resolve(level.title, ctx) : '';
  const subtitleValue = level?.subtitle != null ? resolve(level.subtitle, ctx) : undefined;
  const chartHeight = level?.height ?? height;

  const body = (() => {
    if (error) return <div className="error-box">{error}</div>;
    if (loading) return <SkeletonChart height={chartHeight} />;
    if (!level) return <div className="muted">Nothing to show.</div>;
    if (rows.length === 0) return <div className="muted">{level.emptyMessage ?? 'No data for the selected period.'}</div>;
    if (level.kind === 'custom') {
      return <>{level.render(rows, ctx, { drill: drillInto, canDrill: rowCanDrill })}</>;
    }
    return renderPlot(level, rows, chartHeight, isDrillable, drillByIndex);
  })();

  const drillTargets = useMemo(() => {
    if (!showDrillTargets || !isDrillable || loading || error) return [];
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => rowCanDrill(row))
      .slice(0, maxDrillTargets);
  }, [error, isDrillable, loading, maxDrillTargets, rowCanDrill, rows, showDrillTargets]);

  /** Field used to label the accessible drill buttons (the visible category label). */
  const targetLabelKey = level ? (level.kind === 'custom' ? level.drillKey ?? '' : level.categoryKey) : '';

  const nextTitleHint = useMemo(() => {
    const next = levels[depth + 1];
    if (!next) return 'details';
    // Only static titles are safe to preview — a title function expects a crumb we
    // don't have yet.
    return typeof next.title === 'string' ? next.title : 'details';
  }, [levels, depth]);

  return (
    <div className={cn(className)}>
      <Card title={title} subtitle={subtitleValue}>
        <nav
          aria-label="Drill-through path"
          className="mb-3 flex flex-wrap items-center gap-1.5"
          style={{ marginTop: subtitleValue ? 0 : -6 }}
        >
          {depth > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mr-1"
              onClick={() => goToDepth(depth - 1)}
              aria-label={`Back to ${depth === 1 ? rootLabel : activePath[depth - 2].label}`}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => goToDepth(0)}
            disabled={depth === 0}
            aria-current={depth === 0 ? 'page' : undefined}
          >
            {rootLabel}
          </Button>
          {activePath.map((crumb, i) => {
            const isCurrent = i === activePath.length - 1;
            return (
              <span key={`${crumb.key}:${crumb.value}`} className="flex items-center gap-1.5">
                <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {isCurrent ? (
                  <Badge variant="secondary" aria-current="page">
                    {crumb.label}
                  </Badge>
                ) : (
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => goToDepth(i + 1)}>
                    {crumb.label}
                  </Button>
                )}
              </span>
            );
          })}
        </nav>

        {body}

        {drillTargets.length > 0 && (
          <div className="mt-3" role="group" aria-label={`Drill into ${nextTitleHint}`}>
            <p className="muted small" style={{ margin: '0 0 6px' }}>
              Click a data point to drill into {nextTitleHint}, or use these:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {drillTargets.map(({ row, index }) => {
                const label = s(row[targetLabelKey], `Item ${index + 1}`);
                return (
                  <Button
                    key={`${index}:${label}`}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => drillByIndex(index)}
                    aria-label={`Drill into ${label}`}
                  >
                    {label}
                    <ChevronRight aria-hidden="true" />
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default DrillChart;

// ---------------------------------------------------------------------------
// Plot rendering
// ---------------------------------------------------------------------------

/**
 * Click handling differs per chart kind, on purpose:
 *
 * - Bar / Pie get an element-level `onClick`, typed by recharts as
 *   `(data, index, event) => void`. Each rectangle/sector is its own hit target, so
 *   the `index` recharts hands back is exactly the index in the level's `data` array —
 *   no coordinate guessing, and clicking outside a bar correctly does nothing.
 * - Line / Area have no meaningful hit target (a 2px stroke and a 3px dot are far too
 *   small to demand a click on), so those use the CHART-level `onClick`, which recharts
 *   types as `CategoricalChartFunc` and which reports `activeTooltipIndex` — the point
 *   nearest the cursor anywhere in the plot area. That is the same index into `data`,
 *   and it is the only reliable way to click a line series.
 */
function renderPlot<Row extends DrillRow>(
  level: DrillPlotLevel<Row>,
  rows: Row[],
  chartHeight: number,
  drillable: boolean,
  drillByIndex: (index: number) => void
) {
  const { categoryKey, series, stacked, layout = 'horizontal' } = level;
  const valueFormatter = level.valueFormatter ?? ((v: number) => num.format(v));
  const categoryFormatter = level.categoryFormatter;
  const color = (sr: DrillSeries, i: number) => sr.color ?? CHART_COLORS[i % CHART_COLORS.length];
  const cursor = drillable ? 'pointer' : undefined;

  // Recharts' chart-level onClick is `(state, event) => void`; a one-param handler is
  // assignable and keeps us off `any`.
  const onChartClick = drillable
    ? (state: ChartClickState) => {
        if (typeof state?.activeTooltipIndex === 'number') drillByIndex(state.activeTooltipIndex);
      }
    : undefined;

  // Element-level handler for Bar/Pie. Recharts declares these as
  // `(data: any, index: number, e) => void`, so a narrower first parameter is fine.
  const onItemClick = drillable ? (_item: unknown, index: number) => drillByIndex(index) : undefined;

  const tooltip = (
    <Tooltip
      contentStyle={tooltipStyle}
      labelStyle={{ color: 'var(--muted)' }}
      formatter={(value: number | string) => valueFormatter(n(value))}
      labelFormatter={categoryFormatter ? (label: unknown) => categoryFormatter(s(label)) : undefined}
    />
  );
  const legend = series.length > 1 ? <Legend wrapperStyle={legendStyle} /> : null;

  // No stroke/tick colour props on grid or axes — global CSS themes them so the
  // light/dark switch keeps working.
  const axes =
    layout === 'vertical' ? (
      <>
        <XAxis type="number" tickFormatter={valueFormatter} />
        <YAxis type="category" dataKey={categoryKey} width={140} interval={0} tickFormatter={categoryFormatter} />
      </>
    ) : (
      <>
        <XAxis dataKey={categoryKey} interval={0} tickFormatter={categoryFormatter} />
        <YAxis tickFormatter={valueFormatter} width={80} />
      </>
    );

  if (level.kind === 'pie') {
    const measure = series[0];
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Pie
            data={rows}
            dataKey={measure.key}
            nameKey={categoryKey}
            outerRadius="75%"
            cursor={cursor}
            onClick={onItemClick}
            isAnimationActive={false}
          >
            {rows.map((row, i) => (
              <Cell key={`${s(row[categoryKey])}-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          {tooltip}
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (level.kind === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={rows} layout={layout} margin={layout === 'vertical' ? { left: 20 } : { bottom: 10 }} accessibilityLayer>
          <CartesianGrid strokeDasharray="3 3" />
          {axes}
          {tooltip}
          {legend}
          {series.map((sr, i) => (
            <Bar
              key={sr.key}
              dataKey={sr.key}
              name={sr.name}
              fill={color(sr, i)}
              stackId={stacked ? 'stack' : undefined}
              radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              cursor={cursor}
              onClick={onItemClick}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (level.kind === 'area') {
    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart
          data={rows}
          layout={layout}
          margin={{ bottom: 10 }}
          onClick={onChartClick}
          style={{ cursor }}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" />
          {axes}
          {tooltip}
          {legend}
          {series.map((sr, i) => (
            <Area
              key={sr.key}
              type="monotone"
              dataKey={sr.key}
              name={sr.name}
              stroke={color(sr, i)}
              fill={color(sr, i)}
              fillOpacity={0.22}
              strokeWidth={2}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // line
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart data={rows} layout={layout} margin={{ bottom: 10 }} onClick={onChartClick} style={{ cursor }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" />
        {axes}
        {tooltip}
        {legend}
        {series.map((sr, i) => (
          <Line
            key={sr.key}
            type="monotone"
            dataKey={sr.key}
            name={sr.name}
            stroke={color(sr, i)}
            strokeWidth={2}
            dot={rows.length <= 24 ? { r: 3 } : false}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

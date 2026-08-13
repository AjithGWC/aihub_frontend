import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { COLOR, FONT_HEADING } from "./atlasTheme";
import type { TeamDashboardData, KpiItem, ChartItem, TableItem } from "../data/teamDashboards";

/* ------------------------------------------------------------------ */
/*  Renders a full KPI / chart / table dashboard from a plain data      */
/*  object matching TeamDashboardData — nothing here is team-specific,  */
/*  swap the data prop and the whole view updates.                      */
/* ------------------------------------------------------------------ */

const DONUT_COLORS = [COLOR.accent400, COLOR.accent2_400, COLOR.neutral500, COLOR.accent600];

const tooltipStyle = {
  background: "#2a2620",
  border: `1px solid ${COLOR.hairline}`,
  borderRadius: 8,
  color: COLOR.neutral100,
  fontSize: 12,
};

const SectionLabel = ({ children }: { children: string }) => (
  <div className="text-[11px] uppercase" style={{ letterSpacing: ".14em", color: COLOR.neutral500 }}>
    {children}
  </div>
);

function KpiCard({ item }: { item: KpiItem }) {
  const trimmed = item.change.trim();
  const isNeg = trimmed.startsWith("-");
  const isPos = trimmed.startsWith("+");
  const tone = isNeg ? "#E38B7D" : isPos ? COLOR.accent2_300 : COLOR.neutral500;
  const Icon = isNeg ? TrendingDown : isPos ? TrendingUp : Minus;

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl px-4 py-3.5"
      style={{ background: "rgba(249,244,237,.035)", border: `1px solid ${COLOR.hairline}` }}
    >
      <div className="text-[11px] uppercase leading-tight" style={{ letterSpacing: ".08em", color: COLOR.neutral500 }}>
        {item.title}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontFamily: FONT_HEADING, fontSize: 22, color: COLOR.neutral100 }}>{item.value}</span>
        <span className="text-[12px]" style={{ color: COLOR.neutral400 }}>
          {item.unit}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: tone }}>
        <Icon size={13} />
        {item.change}
      </div>
    </div>
  );
}

function ChartCard({ chart }: { chart: ChartItem }) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl p-4"
      style={{ background: "rgba(249,244,237,.035)", border: `1px solid ${COLOR.hairline}` }}
    >
      <div className="text-[14px] font-semibold" style={{ color: COLOR.neutral100 }}>
        {chart.title}
      </div>
      <div className="text-[11px]" style={{ color: COLOR.neutral500 }}>
        {chart.description}
      </div>
      <div style={{ width: "100%", height: 190, marginTop: 6 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "line" ? (
            <LineChart data={chart.data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(249,244,237,.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLOR.neutral500, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: COLOR.neutral500, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={COLOR.accent400} strokeWidth={2.2} dot={{ r: 3, fill: COLOR.accent400 }} />
            </LineChart>
          ) : chart.type === "bar" ? (
            <BarChart data={chart.data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(249,244,237,.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: COLOR.neutral500, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: COLOR.neutral500, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={COLOR.accent2_400} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Pie data={chart.data} dataKey="value" nameKey="label" innerRadius={42} outerRadius={72} paddingAngle={2}>
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      {chart.type === "donut" && (
        <div className="flex flex-wrap gap-3 mt-1">
          {chart.data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: COLOR.neutral400 }}>
              <span className="rounded-full" style={{ width: 8, height: 8, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              {d.label} — {d.value}%
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TableCard({ table }: { table: TableItem }) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl p-4"
      style={{ background: "rgba(249,244,237,.035)", border: `1px solid ${COLOR.hairline}` }}
    >
      <div className="text-[14px] font-semibold" style={{ color: COLOR.neutral100 }}>
        {table.title}
      </div>
      <div className="text-[11px] mb-1.5" style={{ color: COLOR.neutral500 }}>
        {table.description}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {table.columns.map((col) => (
                <th
                  key={col}
                  className="uppercase whitespace-nowrap px-3 py-2"
                  style={{ letterSpacing: ".05em", fontSize: 10, color: COLOR.neutral500, borderBottom: `1px solid ${COLOR.hairline}` }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {table.columns.map((col) => (
                  <td
                    key={col}
                    className="whitespace-nowrap px-3 py-2"
                    style={{ color: COLOR.neutral300, borderBottom: `1px solid rgba(249,244,237,.05)` }}
                  >
                    {row[col] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TeamDashboard({ data }: { data: TeamDashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SectionLabel>Key metrics</SectionLabel>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {data.kpiSection.map((item, i) => (
            <KpiCard key={i} item={item} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>Charts</SectionLabel>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {data.charts.map((chart, i) => (
            <ChartCard key={i} chart={chart} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionLabel>Details</SectionLabel>
        <div className="flex flex-col gap-3">
          {data.tables.map((table, i) => (
            <TableCard key={i} table={table} />
          ))}
        </div>
      </div>
    </div>
  );
}

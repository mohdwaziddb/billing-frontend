import { Cell, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AiChart } from "../types/ai.types";

const FALLBACK_COLORS = ["#0EA5E9", "#14B8A6", "#F59E0B", "#F97316", "#8B5CF6", "#EF4444", "#22C55E", "#6366F1"];

export const AiChartCard = ({ chart }: { chart: AiChart }) => {
  const series = chart.series?.length ? chart.series : [{ key: chart.valueKey, label: chart.title, color: FALLBACK_COLORS[0] }];
  const height = chart.type === "PIE" ? 260 : 220;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{chart.title}</p>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "PIE" ? (
            <PieChart>
              <Pie data={chart.data} dataKey={chart.valueKey} nameKey={chart.labelKey} innerRadius={44} outerRadius={76} paddingAngle={2}>
                {chart.data.map((entry, index) => (
                  <Cell key={`${String(entry[chart.labelKey])}-${index}`} fill={FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | string) => formatValue(value)} />
            </PieChart>
          ) : chart.type === "BAR" ? (
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey={chart.labelKey} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip formatter={(value: number | string) => formatValue(value)} />
              {series.map((item, index) => (
                <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey={chart.labelKey} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip formatter={(value: number | string) => formatValue(value)} />
              {series.map((item, index) => (
                <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const formatValue = (value: number | string) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numeric)) {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(numeric);
  }
  return value;
};

import { BarChart3, Table2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { formatCurrency, formatShortCurrency } from "../../lib/currency";
import { getChartTheme } from "../../lib/chartTheme";

export type SalesCollectionsPoint = {
  /** Axis: "15 Oct" / "Oct 26" */
  axisLabel: string;
  /** Tooltip / table: "Thu, 15 Oct 2026" / "October 2026" */
  fullLabel: string;
  sales: number;
  collections: number;
};

/** Validated pair (dataviz palette slots 1 & 3): light / dark steps alag, dono surface par pass. */
export const SALES_COLLECTION_COLORS = {
  light: { sales: "#2a78d6", collections: "#1baf7a", surface: "#ffffff", label: "#0f172a" },
  dark: { sales: "#3987e5", collections: "#199e70", surface: "#0f172a", label: "#f1f5f9" }
} as const;

const ChartTooltip = ({ active, payload, dark }: TooltipProps<number, string> & { dark: boolean }) => {
  if (!active || !payload?.length) {
    return null;
  }
  const point = payload[0]?.payload as SalesCollectionsPoint | undefined;
  if (!point) {
    return null;
  }
  const colors = dark ? SALES_COLLECTION_COLORS.dark : SALES_COLLECTION_COLORS.light;
  const theme = getChartTheme(dark);
  const gap = point.sales - point.collections;
  return (
    <div style={{ ...theme.tooltipContentStyle, borderRadius: 12, padding: "10px 12px", minWidth: 210 }}>
      <p className="fs-12 font-bold" style={theme.tooltipLabelStyle}>{point.fullLabel}</p>
      <div className="mt-2 space-y-1.5 fs-12" style={theme.tooltipItemStyle}>
        <p className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.sales }} />Billed</span>
          <span className="font-bold tabular-nums">{formatCurrency(point.sales)}</span>
        </p>
        <p className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.collections }} />Collected</span>
          <span className="font-bold tabular-nums">{formatCurrency(point.collections)}</span>
        </p>
        {point.sales > 0 || point.collections > 0 ? (
          <p className="flex items-center justify-between gap-4 border-t pt-1.5" style={{ borderColor: theme.grid }}>
            <span>{gap > 0 ? "Pending from this day" : "Extra collected"}</span>
            <span className="font-semibold tabular-nums">{formatCurrency(Math.abs(gap))}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
};

/**
 * Dashboard ka main chart: har din/mahine kitna bill hua vs kitna paisa aaya — side-by-side bars
 * (bikhre daily data par smooth line beech ke khaali dinon me jhoothi "pahadi" bana deti thi).
 * Dono ₹ me — ek hi axis. KPI tiles + legend upar, hover par baaki bars halke, sabse accha din
 * direct-label, crosshair tooltip, aur table view (har value bina hover ke bhi padhi ja sake).
 */
export const SalesCollectionsChart = ({
  data,
  dark,
  periodUnit,
  rangeNote,
  loading
}: {
  data: SalesCollectionsPoint[];
  dark: boolean;
  /** Bucket: din ya mahina (labels / "Best day" text ke liye). */
  periodUnit: "day" | "month";
  rangeNote?: string;
  loading?: boolean;
}) => {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const colors = dark ? SALES_COLLECTION_COLORS.dark : SALES_COLLECTION_COLORS.light;
  const theme = getChartTheme(dark);
  const totals = useMemo(
    () => data.reduce((acc, point) => ({ sales: acc.sales + point.sales, collections: acc.collections + point.collections }), { sales: 0, collections: 0 }),
    [data]
  );
  const bestIndex = useMemo(() => {
    let best = -1;
    data.forEach((point, index) => {
      if (point.sales > 0 && (best < 0 || point.sales > data[best].sales)) {
        best = index;
      }
    });
    return best;
  }, [data]);
  const hasData = totals.sales > 0 || totals.collections > 0;
  const activeDays = data.filter((point) => point.sales > 0 || point.collections > 0).length;
  const billedDays = data.filter((point) => point.sales > 0).length;
  const averagePerActive = billedDays > 0 ? totals.sales / billedDays : 0;
  // Do bars per period (billed + collected); patle rakho, slot ka baaki hissa hawa.
  const barSize = data.length > 24 ? 7 : data.length > 12 ? 10 : 18;
  const best = bestIndex >= 0 ? data[bestIndex] : null;

  return (
    <div>
      {/* Totals upar ke stat cards me hain — yahan dobara nahi. Sirf legend + chart se nikli nayi baatein. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="inline-flex items-center gap-2 fs-12 font-semibold text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.sales }} />
          Billed
        </span>
        <span className="inline-flex items-center gap-2 fs-12 font-semibold text-slate-600">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.collections }} />
          Collected
        </span>
        {best ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 fs-12 font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" title={`${best.fullLabel}: ${formatCurrency(best.sales)}`}>
            <Trophy size={13} />
            Best {periodUnit}: {best.axisLabel} · {formatShortCurrency(best.sales)}
          </span>
        ) : null}
        {hasData && averagePerActive > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 fs-12 font-semibold text-slate-600" title={formatCurrency(averagePerActive)}>
            Avg {formatShortCurrency(averagePerActive)} per active {periodUnit}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="fs-11 font-medium text-slate-400">
          {rangeNote ?? (hasData ? `${activeDays} ${periodUnit}${activeDays === 1 ? "" : "s"} with activity` : "")}
        </p>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5" role="tablist" aria-label="Chart view">
          {([
            ["chart", "Chart", <BarChart3 key="c" size={14} />],
            ["table", "Table", <Table2 key="t" size={14} />]
          ] as const).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 fs-12 font-semibold transition ${view === value ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
              onClick={() => setView(value)}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Refetch par purana chart halka dikhta hai, layout jump nahi. */}
      <div className={`mt-2 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
        {!hasData ? (
          <div className="flex h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
            <BarChart3 className="text-slate-300" size={30} />
            <p className="mt-2 text-sm font-semibold text-slate-500">No sales or collections in this period</p>
            <p className="mt-1 fs-12 text-slate-400">Create an invoice or record a payment to see the trend.</p>
          </div>
        ) : view === "chart" ? (
          <div className="h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                barGap={2}
                margin={{ top: 22, right: 8, bottom: 0, left: 0 }}
                onMouseMove={(state) => setActiveIndex(typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : null)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="axisLabel" minTickGap={14} tick={{ fill: theme.text, fontSize: 11 }} axisLine={{ stroke: theme.grid }} tickLine={false} />
                <YAxis width={52} tickFormatter={(tickValue: number) => formatShortCurrency(tickValue)} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip dark={dark} />} cursor={{ fill: dark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.04)" }} />
                <Bar
                  dataKey="sales"
                  name="Billed"
                  barSize={barSize}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive
                  animationDuration={600}
                  label={(props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) => {
                    // Direct label sirf sabse acche din par (har bar par number = shor).
                    if (props.index !== bestIndex || bestIndex < 0) {
                      return <g />;
                    }
                    const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
                    const y = Number(props.y ?? 0) - 8;
                    return (
                      <text x={x} y={y} textAnchor="middle" fill={colors.label} fontSize={11} fontWeight={700}>
                        {formatShortCurrency(data[bestIndex].sales)}
                      </text>
                    );
                  }}
                >
                  {data.map((point, index) => (
                    <Cell key={point.fullLabel} fill={colors.sales} fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4} />
                  ))}
                </Bar>
                <Bar dataKey="collections" name="Collected" barSize={barSize} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={700}>
                  {data.map((point, index) => (
                    <Cell key={point.fullLabel} fill={colors.collections} fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="max-h-[310px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full fs-13 text-slate-700">
              <thead className="sticky top-0 bg-slate-50 text-left fs-11 uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">{periodUnit === "day" ? "Date" : "Month"}</th>
                  <th className="px-3 py-2 text-right font-semibold">Billed</th>
                  <th className="px-3 py-2 text-right font-semibold">Collected</th>
                  <th className="px-3 py-2 text-right font-semibold">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {data.filter((point) => point.sales > 0 || point.collections > 0).map((point) => (
                  <tr key={point.fullLabel}>
                    <td className="whitespace-nowrap px-3 py-2">{point.fullLabel}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(point.sales)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(point.collections)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(Math.max(0, point.sales - point.collections))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-50 font-bold text-slate-900">
                <tr>
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(totals.sales)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(totals.collections)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Math.max(0, totals.sales - totals.collections))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps
} from "recharts";
import { getChartTheme } from "../../lib/chartTheme";
import { formatCurrency, formatShortCurrency } from "../../lib/currency";

/**
 * Validated set (dataviz palette slots: blue / aqua / orange / violet) — light aur dark ke
 * alag steps, dono surface par validator pass. Billed = blue, Collected = aqua,
 * Expense = orange, Net = violet: har chart me yehi identity.
 */
export const ANALYTICS_COLORS = {
  light: { billed: "#2a78d6", collected: "#1baf7a", expense: "#eb6834", net: "#6250d6", due: "#e34948", surface: "#ffffff", ink: "#0f172a" },
  dark: { billed: "#3987e5", collected: "#199e70", expense: "#d95926", net: "#9085e9", due: "#e66767", surface: "#0f172a", ink: "#f1f5f9" }
} as const;

export type PeriodPoint = { axisLabel: string; fullLabel: string };

const Swatch = ({ color, shape = "square" }: { color: string; shape?: "square" | "line" }) =>
  shape === "line" ? <span className="h-0.5 w-3.5 rounded-full" style={{ background: color }} /> : <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />;

const TooltipBox = ({ dark, title, rows }: { dark: boolean; title: string; rows: Array<{ label: string; value: string; color?: string; strong?: boolean }> }) => {
  const theme = getChartTheme(dark);
  return (
    <div style={{ ...theme.tooltipContentStyle, borderRadius: 12, padding: "10px 12px", minWidth: 200 }}>
      <p className="fs-12 font-bold" style={theme.tooltipLabelStyle}>{title}</p>
      <div className="mt-2 space-y-1.5 fs-12" style={theme.tooltipItemStyle}>
        {rows.map((row) => (
          <p key={row.label} className={`flex items-center justify-between gap-4 ${row.strong ? "border-t pt-1.5 font-semibold" : ""}`} style={row.strong ? { borderColor: theme.grid } : undefined}>
            <span className="flex items-center gap-2">{row.color ? <Swatch color={row.color} /> : null}{row.label}</span>
            <span className="font-bold tabular-nums">{row.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
};

const EmptyChart = ({ text, height = 280 }: { text: string; height?: number }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center" style={{ height }}>
    <p className="text-sm font-semibold text-slate-500">{text}</p>
  </div>
);

/* ---------------------------------------------------------------- Cash in vs cash out */

export type CashFlowPoint = PeriodPoint & { collected: number; expense: number };

/**
 * Diverging bars: paisa aaya (upar, aqua) vs gaya (neeche, orange) har din/mahine.
 * Zero line hi "baseline" hai — neeche jaana kharcha, upar jaana aamdani.
 */
export const CashFlowChart = ({ data, dark }: { data: CashFlowPoint[]; dark: boolean }) => {
  const colors = dark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;
  const theme = getChartTheme(dark);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartData = useMemo(() => data.map((point) => ({ ...point, out: -point.expense })), [data]);
  const totals = useMemo(() => data.reduce((acc, point) => ({ in: acc.in + point.collected, out: acc.out + point.expense }), { in: 0, out: 0 }), [data]);
  const net = totals.in - totals.out;
  const barSize = data.length > 24 ? 8 : data.length > 12 ? 12 : 20;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 fs-12 font-semibold text-slate-600">
        <span className="inline-flex items-center gap-2"><Swatch color={colors.collected} />Cash in · {formatShortCurrency(totals.in)}</span>
        <span className="inline-flex items-center gap-2"><Swatch color={colors.expense} />Cash out · {formatShortCurrency(totals.out)}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${net >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"}`}>
          {net >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          Net {net >= 0 ? "+" : "−"}{formatShortCurrency(Math.abs(net))}
        </span>
      </div>
      {totals.in === 0 && totals.out === 0 ? (
        <div className="mt-3"><EmptyChart text="No collections or expenses in this period" /></div>
      ) : (
        <div className="mt-3 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              stackOffset="sign"
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              onMouseMove={(state) => setActiveIndex(typeof state?.activeTooltipIndex === "number" ? state.activeTooltipIndex : null)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="axisLabel" minTickGap={14} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis width={52} tickFormatter={(value: number) => formatShortCurrency(value)} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke={dark ? "#475569" : "#94a3b8"} />
              <Tooltip
                cursor={{ fill: dark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.04)" }}
                content={({ active, payload }: TooltipProps<number, string>) => {
                  const point = payload?.[0]?.payload as (CashFlowPoint & { out: number }) | undefined;
                  if (!active || !point) return null;
                  const dayNet = point.collected - point.expense;
                  return (
                    <TooltipBox
                      dark={dark}
                      title={point.fullLabel}
                      rows={[
                        { label: "Cash in", value: formatCurrency(point.collected), color: colors.collected },
                        { label: "Cash out", value: formatCurrency(point.expense), color: colors.expense },
                        { label: "Net", value: `${dayNet >= 0 ? "+" : "−"}${formatCurrency(Math.abs(dayNet))}`, strong: true }
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="collected" stackId="flow" barSize={barSize} radius={[4, 4, 0, 0]}>
                {chartData.map((point, index) => <Cell key={point.fullLabel} fill={colors.collected} fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4} />)}
              </Bar>
              <Bar dataKey="out" stackId="flow" barSize={barSize} radius={[0, 0, 4, 4]}>
                {chartData.map((point, index) => <Cell key={point.fullLabel} fill={colors.expense} fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ---------------------------------------------------------------- Money flow */

/**
 * Period ka hisaab ek nazar me: Billed → Collected → Expenses → Net (collected − expenses).
 * Lambai same scale par (sabse bada = 100%), value bar ke end par text me.
 */
export const MoneyFlow = ({ billed, collected, expense, dark }: { billed: number; collected: number; expense: number; dark: boolean }) => {
  const colors = dark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;
  const net = collected - expense;
  const rows = [
    { key: "billed", label: "Billed", hint: "Invoices raised", value: billed, color: colors.billed },
    { key: "collected", label: "Collected", hint: billed > 0 ? `${((collected / billed) * 100).toFixed(0)}% of billed` : "Payments received", value: collected, color: colors.collected },
    { key: "expense", label: "Expenses", hint: collected > 0 ? `${((expense / collected) * 100).toFixed(0)}% of collected` : "Business spend", value: expense, color: colors.expense },
    { key: "net", label: "Net cash", hint: "Collected − expenses", value: net, color: colors.net }
  ];
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  if (billed === 0 && collected === 0 && expense === 0) {
    return <EmptyChart text="No billing, collections or expenses in this period" height={220} />;
  }
  return (
    <ol className="space-y-4">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0">
              <span className="fs-13 font-semibold text-slate-800">{row.label}</span>
              <span className="ml-2 fs-11 text-slate-400">{row.hint}</span>
            </p>
            <span className={`shrink-0 fs-14 font-bold tabular-nums ${row.value < 0 ? "text-rose-600" : "text-slate-950"}`}>
              {row.value < 0 ? "−" : ""}{formatCurrency(Math.abs(row.value))}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${row.value === 0 ? 0 : Math.max(1.5, (Math.abs(row.value) / max) * 100)}%`, background: row.value < 0 ? colors.due : row.color }} />
          </div>
        </li>
      ))}
    </ol>
  );
};

/* ---------------------------------------------------------------- 12-month revenue */

export type MonthPoint = { axisLabel: string; fullLabel: string; value: number };

/**
 * Pichhle 12 mahine ka billing (filter se independent — lamba context). Current mahina
 * poore rang me, baaki halke; current par direct label; "vs last month" badge.
 */
export const MonthlyRevenueChart = ({ data, dark }: { data: MonthPoint[]; dark: boolean }) => {
  const colors = dark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;
  const theme = getChartTheme(dark);
  const last = data[data.length - 1];
  const previous = data[data.length - 2];
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const change = previous && previous.value > 0 && last ? ((last.value - previous.value) / previous.value) * 100 : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 fs-12 font-semibold text-slate-600">
        <span>12-month total · <span className="text-slate-950">{formatShortCurrency(total)}</span></span>
        {last ? (
          change === null ? (
            last.value > 0 ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600" title="No billing in the previous month">New this month</span> : null
          ) : (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${change >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"}`}>
              {change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {change >= 0 ? "+" : ""}{change.toFixed(0)}% vs {previous?.axisLabel}
            </span>
          )
        ) : null}
      </div>
      {total === 0 ? (
        <div className="mt-3"><EmptyChart text="No billing in the last 12 months" /></div>
      ) : (
        <div className="mt-3 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="axisLabel" interval="preserveStartEnd" minTickGap={4} tick={{ fill: theme.text, fontSize: 11 }} axisLine={{ stroke: theme.grid }} tickLine={false} />
              <YAxis width={52} tickFormatter={(value: number) => formatShortCurrency(value)} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: dark ? "rgba(148,163,184,0.10)" : "rgba(15,23,42,0.04)" }}
                content={({ active, payload }: TooltipProps<number, string>) => {
                  const point = payload?.[0]?.payload as MonthPoint | undefined;
                  if (!active || !point) return null;
                  return <TooltipBox dark={dark} title={point.fullLabel} rows={[{ label: "Billed", value: formatCurrency(point.value), color: colors.billed }]} />;
                }}
              />
              <Bar
                dataKey="value"
                barSize={22}
                radius={[4, 4, 0, 0]}
                label={(props: { x?: number | string; y?: number | string; width?: number | string; index?: number }) => {
                  if (props.index !== data.length - 1 || !last || last.value <= 0) return <g />;
                  return (
                    <text x={Number(props.x ?? 0) + Number(props.width ?? 0) / 2} y={Number(props.y ?? 0) - 8} textAnchor="middle" fill={colors.ink} fontSize={11} fontWeight={700}>
                      {formatShortCurrency(last.value)}
                    </text>
                  );
                }}
              >
                {data.map((point, index) => <Cell key={point.fullLabel} fill={colors.billed} fillOpacity={index === data.length - 1 ? 1 : 0.45} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

/* ---------------------------------------------------------------- Receivables balance */

export type BalancePoint = PeriodPoint & { value: number };

/**
 * Running receivable (baaki paisa) — sirf invoice / payment par badalta hai, isliye step line
 * (smooth curve beech ke dinon me jhootha utaar-chadhaav dikhati).
 */
export const ReceivablesChart = ({ data, dark }: { data: BalancePoint[]; dark: boolean }) => {
  const colors = dark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;
  const theme = getChartTheme(dark);
  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const peak = data.reduce((best, point) => (point.value > best.value ? point : best), data[0] ?? { value: 0, axisLabel: "", fullLabel: "" });
  const change = last - first;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 fs-12 font-semibold text-slate-600">
        <span className="inline-flex items-center gap-2"><Swatch color={colors.due} shape="line" />Now · <span className="text-slate-950">{formatShortCurrency(last)}</span></span>
        {data.length > 1 ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${change <= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"}`} title="Change since the start of the period (lower is better)">
            {change <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
            {change === 0 ? "No change" : `${change > 0 ? "+" : "−"}${formatShortCurrency(Math.abs(change))} this period`}
          </span>
        ) : null}
        {peak && peak.value > 0 ? <span className="text-slate-500">Peak {formatShortCurrency(peak.value)} on {peak.axisLabel}</span> : null}
      </div>
      {data.every((point) => point.value === 0) ? (
        <div className="mt-3"><EmptyChart text="Nothing outstanding in this period" /></div>
      ) : data.length < 2 ? (
        // Ek hi din / mahina: line ka matlab nahi (akela dot dikhta tha) — seedha number.
        <div className="mt-3 flex h-[280px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-center">
          <p className="fs-12 font-semibold uppercase tracking-[0.14em] text-slate-500">Outstanding on {data[0]?.fullLabel}</p>
          <p className="mt-2 fs-24 font-bold" style={{ color: colors.due }}>{formatCurrency(last)}</p>
          <p className="mt-2 fs-12 text-slate-400">Pick This Week or This Month to see how it moved.</p>
        </div>
      ) : (
        <div className="mt-3 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="receivablesWash" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={colors.due} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={colors.due} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="axisLabel" minTickGap={14} tick={{ fill: theme.text, fontSize: 11 }} axisLine={{ stroke: theme.grid }} tickLine={false} />
              <YAxis width={52} tickFormatter={(value: number) => formatShortCurrency(value)} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ stroke: theme.grid }}
                content={({ active, payload }: TooltipProps<number, string>) => {
                  const point = payload?.[0]?.payload as BalancePoint | undefined;
                  if (!active || !point) return null;
                  return <TooltipBox dark={dark} title={point.fullLabel} rows={[{ label: "Outstanding", value: formatCurrency(point.value), color: colors.due }]} />;
                }}
              />
              <Area type="stepAfter" dataKey="value" stroke={colors.due} strokeWidth={2} fill="url(#receivablesWash)" dot={false} activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2, fill: colors.due }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

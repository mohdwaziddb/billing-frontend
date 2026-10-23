import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatShortCurrency } from "../../lib/currency";
import { getChartTheme } from "../../lib/chartTheme";
import { ANALYTICS_COLORS } from "./AnalyticsCharts";

type Step = { key: string; label: string; range: [number, number]; amount: number; kind: "total" | "minus"; color: string; note: string };

/**
 * P&L waterfall: Revenue → − maal ki laagat → Gross profit → − kharcha → Net profit.
 * Minus wale bars "tairte" hain (range bar) taaki dikhe har step me kitna kata.
 */
export const ProfitWaterfallChart = ({ revenue, cogs, expense, dark }: { revenue: number; cogs: number; expense: number; dark: boolean }) => {
  const theme = getChartTheme(dark);
  const colors = dark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;
  const gross = revenue - cogs;
  const net = gross - expense;
  const pct = (value: number) => (revenue > 0 ? `${((value / revenue) * 100).toFixed(1)}% of revenue` : "");
  const span = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];

  const steps: Step[] = [
    { key: "revenue", label: "Revenue", range: span(0, revenue), amount: revenue, kind: "total", color: colors.billed, note: "Before GST" },
    { key: "cogs", label: "Cost of goods", range: span(revenue, gross), amount: cogs, kind: "minus", color: colors.expense, note: pct(cogs) },
    { key: "gross", label: "Gross profit", range: span(0, gross), amount: gross, kind: "total", color: gross >= 0 ? colors.collected : colors.due, note: pct(gross) },
    { key: "expense", label: "Expenses", range: span(gross, net), amount: expense, kind: "minus", color: colors.expense, note: pct(expense) },
    { key: "net", label: "Net profit", range: span(0, net), amount: net, kind: "total", color: net >= 0 ? colors.net : colors.due, note: pct(net) }
  ];

  if (revenue === 0 && cogs === 0 && expense === 0) {
    return <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">No revenue or costs in this range.</div>;
  }

  const display = (step: Step) => (step.kind === "minus" && step.amount > 0 ? `− ${formatShortCurrency(step.amount)}` : formatShortCurrency(step.amount));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: theme.text, fontSize: 11 }} axisLine={{ stroke: theme.grid }} tickLine={false} interval={0} />
          <YAxis width={52} tickFormatter={(value: number) => formatShortCurrency(value)} tick={{ fill: theme.text, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={theme.tooltipCursor}
            content={({ active, payload }) => {
              const step = active && payload?.length ? (payload[0].payload as Step) : null;
              if (!step) {
                return null;
              }
              return (
                <div style={theme.tooltipContentStyle} className="min-w-[180px] px-3 py-2">
                  <p className="text-xs font-semibold" style={theme.tooltipLabelStyle}>{step.label}</p>
                  <p className="mt-1 text-sm font-bold" style={theme.tooltipItemStyle}>{step.kind === "minus" ? "− " : ""}{formatCurrency(step.amount)}</p>
                  {step.note ? <p className="mt-0.5 text-xs" style={{ color: theme.text }}>{step.note}</p> : null}
                </div>
              );
            }}
          />
          <Bar dataKey="range" maxBarSize={56} radius={[4, 4, 4, 4]} isAnimationActive={false}>
            {steps.map((step) => <Cell key={step.key} fill={step.color} />)}
            <LabelList dataKey="amount" position="top" content={({ x, y, width, index }) => {
              const step = steps[Number(index)];
              if (!step || x === undefined || y === undefined || width === undefined) {
                return null;
              }
              return (
                <text x={Number(x) + Number(width) / 2} y={Number(y) - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill={theme.text}>
                  {display(step)}
                </text>
              );
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

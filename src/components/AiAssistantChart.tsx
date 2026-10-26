import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AiChartData } from "../api/ai";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { getChartTheme } from "../lib/chartTheme";

const formatChartAmount = (value: number) => `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// Alag file taaki recharts (~380KB) har page ke layout ke saath load na ho —
// AiAssistantWidget ise lazy() se tabhi laata hai jab reply me chart aaye.
const AiAssistantChart = ({ data }: { data: AiChartData["data"] }) => {
  const chart = getChartTheme(useIsDarkMode());
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: chart.text }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: chart.text }} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatChartAmount(value)} />
        <Tooltip contentStyle={chart.tooltipContentStyle} itemStyle={chart.tooltipItemStyle} labelStyle={chart.tooltipLabelStyle} cursor={chart.tooltipCursor} formatter={(value: number | string) => [formatChartAmount(Number(value)), ""]} labelFormatter={(label) => `Day ${label}`} />
        <Bar dataKey="sales" name="Sales" fill="var(--theme-color)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="collection" name="Collection" fill="#10b981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default AiAssistantChart;

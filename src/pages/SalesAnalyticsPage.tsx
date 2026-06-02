import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  getAnalyticsSummary,
  getCustomerDueList,
  getDayWiseSales,
  getLowStockProducts,
  getMonthWiseSales,
  getTopProducts
} from "../api/analytics";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { TrendBadge } from "../components/TrendBadge";
import { formatCurrency } from "../lib/currency";
import type {
  AnalyticsSummary,
  CustomerDue,
  LowStockProduct,
  SalesChartPoint,
  TopSellingProduct
} from "../types/api";

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

const yearOptions = Array.from({ length: 5 }, (_, index) => {
  const value = currentYear - index;
  return { label: String(value), value };
});

const monthOptions = [
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 }
];

export const SalesAnalyticsPage = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [dueCustomers, setDueCustomers] = useState<CustomerDue[]>([]);
  const [dayWiseSales, setDayWiseSales] = useState<SalesChartPoint[]>([]);
  const [monthWiseSales, setMonthWiseSales] = useState<SalesChartPoint[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    void Promise.all([
      getAnalyticsSummary(),
      getTopProducts(5),
      getLowStockProducts(5),
      getCustomerDueList(8)
    ]).then(([summaryData, topProductsData, lowStockData, dueData]) => {
      setSummary(summaryData);
      setTopProducts(topProductsData);
      setLowStockProducts(lowStockData);
      setDueCustomers(dueData);
    });
  }, []);

  useEffect(() => {
    void getDayWiseSales(selectedYear, selectedMonth).then(setDayWiseSales);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    void getMonthWiseSales(selectedYear).then(setMonthWiseSales);
  }, [selectedYear]);

  const lowStockCaption = useMemo(() => {
    if (lowStockProducts.length === 0) {
      return "Inventory levels are healthy.";
    }
    return `${lowStockProducts.length} product${lowStockProducts.length > 1 ? "s" : ""} already at or below threshold.`;
  }, [lowStockProducts]);

  return (
    <div className="space-y-4">
      <Header
        title="Sales analytics"
        subtitle="Every metric on this screen is calculated on the backend, then displayed through a premium analytics workspace."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today Sales" value={formatCurrency(summary?.todaySales)} caption={`Yesterday: ${formatCurrency(summary?.yesterdaySales)}`} />
        <StatCard label="This Month" value={formatCurrency(summary?.thisMonthSales)} caption={`Last month: ${formatCurrency(summary?.lastMonthSales)}`} />
        <StatCard label="Outstanding" value={formatCurrency(summary?.totalOutstandingBalance)} caption={`${summary?.dueCustomers ?? 0} customers with dues`} />
        <StatCard label="Low Stock" value={String(summary?.lowStockProducts ?? 0)} caption={lowStockCaption} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Trend snapshot</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Month over month performance</h2>
            </div>
            {summary ? <TrendBadge status={summary.trendStatus} percentage={summary.salesTrendPercentage} /> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Selected month"
              options={monthOptions}
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
            />
            <Select
              label="Selected year"
              options={yearOptions}
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            />
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dayWiseSales}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="salesAmount" stroke="#67e8f9" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Inventory alert</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Low stock products</h2>
          </div>
          <Table
            data={lowStockProducts}
            emptyText="No low stock products."
            columns={[
              { key: "product", header: "Product", render: (item) => <div><p className="font-semibold text-white">{item.productName}</p><p className="text-xs text-slate-400">{item.sku}</p></div> },
              { key: "stock", header: "Stock", render: (item) => <span className="text-amber-200">{item.stockQty}</span> },
              { key: "min", header: "Min", render: (item) => item.minStockQty }
            ]}
          />
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Year view</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Month wise sales</h2>
            </div>
            <Select
              options={yearOptions}
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthWiseSales}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="salesAmount" fill="#34d399" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Best movers</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Top selling products</h2>
          </div>
          <Table
            data={topProducts}
            emptyText="No sales data yet."
            columns={[
              { key: "product", header: "Product", render: (item) => <div><p className="font-semibold text-white">{item.productName}</p><p className="text-xs text-slate-400">{item.sku}</p></div> },
              { key: "qty", header: "Qty Sold", render: (item) => item.totalQtySold },
              { key: "sales", header: "Sales", render: (item) => formatCurrency(item.totalSalesAmount) },
              { key: "stock", header: "Current Stock", render: (item) => item.currentStockQty }
            ]}
          />
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Customer dues</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Due customer list</h2>
        </div>
        <Table
          data={dueCustomers}
          emptyText="No outstanding customer balances."
          columns={[
            { key: "customer", header: "Customer", render: (item) => <div><p className="font-semibold text-white">{item.customerName}</p><p className="text-xs text-slate-400">{item.mobile}</p></div> },
            { key: "email", header: "Email", render: (item) => item.email ?? "--" },
            { key: "due", header: "Current Due", render: (item) => <span className="font-semibold text-rose-200">{formatCurrency(item.currentBalance)}</span> },
            { key: "limit", header: "Credit Limit", render: (item) => formatCurrency(item.creditLimit) }
          ]}
        />
      </GlassCard>
    </div>
  );
};

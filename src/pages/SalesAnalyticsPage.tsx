import { useEffect, useMemo, useState } from "react";
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
  YAxis
} from "recharts";
import { getAnalyticsSummary, getCustomerDueList, getLowStockProducts, getOwnerAnalytics, getTopProducts } from "../api/analytics";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { TrendBadge } from "../components/TrendBadge";
import { formatCurrency } from "../lib/currency";
import type { AnalyticsSummary, CustomerDue, LowStockProduct, OwnerAnalytics, PageResponse, TopSellingProduct } from "../types/api";

type DatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

const buildRange = (preset: DatePreset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toIso = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (preset === "today") {
    return { startDate: toIso(today), endDate: toIso(today) };
  }
  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: toIso(yesterday), endDate: toIso(yesterday) };
  }
  if (preset === "thisWeek") {
    const start = new Date(today);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { startDate: toIso(start), endDate: toIso(today) };
  }
  if (preset === "thisMonth") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toIso(start), endDate: toIso(today) };
  }
  const start = new Date(today.getFullYear(), 0, 1);
  return { startDate: toIso(start), endDate: toIso(today) };
};

const chartTooltip = {
  contentStyle: { background: "rgba(15,23,42,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }
};

const chartColors = ["#38bdf8", "#10b981", "#f97316", "#a78bfa", "#f43f5e"];

export const SalesAnalyticsPage = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [overview, setOverview] = useState<OwnerAnalytics | null>(null);
  const [topProductsPage, setTopProductsPage] = useState<PageResponse<TopSellingProduct>>({
    records: [],
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0
  });
  const [lowStockPage, setLowStockPage] = useState<PageResponse<LowStockProduct>>({
    records: [],
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0
  });
  const [dueCustomersPage, setDueCustomersPage] = useState<PageResponse<CustomerDue>>({
    records: [],
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0
  });
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState(() => buildRange("thisMonth"));

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);

  useEffect(() => {
    void Promise.all([
      getAnalyticsSummary(activeRange),
      getOwnerAnalytics(activeRange),
      getTopProducts({ page: 0, size: DEFAULT_PAGE_SIZE }),
      getLowStockProducts({ page: 0, size: DEFAULT_PAGE_SIZE }),
      getCustomerDueList({ page: 0, size: DEFAULT_PAGE_SIZE })
    ]).then(([summaryData, ownerData, topProductsData, lowStockData, dueData]) => {
      setSummary(summaryData);
      setOverview(ownerData);
      setTopProductsPage(topProductsData);
      setLowStockPage(lowStockData);
      setDueCustomersPage(dueData);
    });
  }, [activeRange]);

  const loadTopProducts = async (page: number) => {
    setTopProductsPage(await getTopProducts({ page, size: DEFAULT_PAGE_SIZE }));
  };

  const loadLowStockProducts = async (page: number) => {
    setLowStockPage(await getLowStockProducts({ page, size: DEFAULT_PAGE_SIZE }));
  };

  const loadDueCustomers = async (page: number) => {
    setDueCustomersPage(await getCustomerDueList({ page, size: DEFAULT_PAGE_SIZE }));
  };

  const lowStockCaption = useMemo(() => {
    if (lowStockPage.totalRecords === 0) {
      return "Inventory levels are healthy.";
    }
    return `${lowStockPage.totalRecords} product${lowStockPage.totalRecords > 1 ? "s" : ""} already at or below threshold.`;
  }, [lowStockPage.totalRecords]);

  const salesVsPayments = useMemo(() => {
    const collectionsByLabel = new Map((overview?.collectionTrend ?? []).map((point) => [point.label, point.value]));
    return (overview?.salesTrend ?? []).map((point) => ({
      label: point.label,
      sales: point.value,
      payments: collectionsByLabel.get(point.label) ?? 0
    }));
  }, [overview]);

  const revenueMix = useMemo(() => {
    const sales = overview?.totalSales ?? 0;
    const collections = overview?.totalCollection ?? 0;
    const outstanding = overview?.outstandingAmount ?? 0;
    return [
      { name: "Sales", value: sales },
      { name: "Payments", value: collections },
      { name: "Outstanding", value: outstanding }
    ].filter((item) => item.value > 0);
  }, [overview]);

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Owner analytics"
        subtitle="Monitor sales, collections, outstanding risk, customer growth, and revenue trends with date-based reporting."
      />

      <GlassCard className="p-6 md:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Filters</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Analytics range</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["thisWeek", "This Week"],
              ["thisMonth", "This Month"],
              ["thisYear", "This Year"],
              ["custom", "Custom Range"]
            ].map(([value, label]) => (
              <Button key={value} type="button" variant={preset === value ? "primary" : "secondary"} onClick={() => setPreset(value as DatePreset)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        {preset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:max-w-xl">
            <Input label="Start date" type="date" value={customRange.startDate} onChange={(event) => setCustomRange((current) => ({ ...current, startDate: event.target.value }))} />
            <Input label="End date" type="date" value={customRange.endDate} onChange={(event) => setCustomRange((current) => ({ ...current, endDate: event.target.value }))} />
          </div>
        ) : null}
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Sales" value={formatCurrency(overview?.totalSales)} caption="Invoiced sales in the selected date range." />
        <StatCard label="Collections" value={formatCurrency(overview?.totalCollection)} caption="Recorded customer collections in range." />
        <StatCard label="Outstanding" value={formatCurrency(overview?.outstandingAmount)} caption="Current company-wide receivable position." />
        <StatCard label="New Customers" value={String(overview?.newCustomers ?? 0)} caption="Customers added during the selected period." />
        <StatCard label="Invoices" value={String(overview?.totalInvoices ?? 0)} caption="Invoices issued during the selected date range." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Revenue mix</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Sales, payments, and dues</h2>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueMix} dataKey="value" nameKey="name" innerRadius={68} outerRadius={110} paddingAngle={4}>
                  {revenueMix.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltip} formatter={(value: number) => formatCurrency(value)} />
                <Legend iconType="circle" wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Sales vs payments</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Collection performance</h2>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesVsPayments}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip {...chartTooltip} formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                <Bar dataKey="sales" name="Sales" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                <Bar dataKey="payments" name="Payments" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Sales trend</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Sales and collection movement</h2>
            </div>
            {summary ? <TrendBadge status={summary.trendStatus} percentage={summary.salesTrendPercentage} /> : null}
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.salesTrend ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip {...chartTooltip} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="value" name="Sales" stroke="#38bdf8" strokeWidth={3} fill="#38bdf8" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview?.collectionTrend ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip {...chartTooltip} formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Outstanding and growth</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Business health indicators</h2>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.outstandingTrend ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip {...chartTooltip} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#f97316" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview?.customerGrowthTrend ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip {...chartTooltip} formatter={(value: number) => value} />
                <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Monthly revenue</p>
            <h2 className="mt-2 text-2xl font-bold text-white">12 month revenue trend</h2>
          </div>
          <div className="h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview?.monthlyRevenue ?? []}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip {...chartTooltip} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="value" name="Revenue" stroke="#0ea5e9" strokeWidth={3} fill="#0ea5e9" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Operational signals</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Current risk snapshot</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Today Sales</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{formatCurrency(summary?.todaySales)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">This Month</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{formatCurrency(summary?.thisMonthSales)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Due Customers</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{summary?.dueCustomers ?? 0}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Low Stock</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{summary?.lowStockProducts ?? 0}</p>
              <p className="mt-2 text-xs text-slate-400">{lowStockCaption}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Best movers</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Top selling products</h2>
          </div>
          <Table
            data={topProductsPage.records}
            emptyText="No sales data yet."
            columns={[
              { key: "product", header: "Product", render: (item) => <div><p className="font-semibold text-white">{item.productName}</p><p className="text-xs text-slate-400">{item.sku}</p></div> },
              { key: "qty", header: "Qty Sold", className: "text-right", render: (item) => <span className="block text-right">{item.totalQtySold}</span> },
              { key: "sales", header: "Sales", className: "text-right", render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.totalSalesAmount)}</span> },
              { key: "stock", header: "Current Stock", className: "text-right", render: (item) => <span className="block text-right">{item.currentStockQty}</span> }
            ]}
          />
          <Pagination
            page={topProductsPage.page}
            size={topProductsPage.size}
            totalRecords={topProductsPage.totalRecords}
            totalPages={topProductsPage.totalPages}
            onPageChange={(nextPage) => void loadTopProducts(nextPage)}
          />
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Inventory alert</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Low stock products</h2>
          </div>
          <Table
            data={lowStockPage.records}
            emptyText="No low stock products."
            columns={[
              { key: "product", header: "Product", render: (item) => <div><p className="font-semibold text-white">{item.productName}</p><p className="text-xs text-slate-400">{item.sku}</p></div> },
              { key: "stock", header: "Stock", className: "text-right", render: (item) => <span className="block text-right font-semibold text-amber-200">{item.stockQty}</span> },
              { key: "min", header: "Min", className: "text-right", render: (item) => <span className="block text-right">{item.minStockQty}</span> }
            ]}
          />
          <Pagination
            page={lowStockPage.page}
            size={lowStockPage.size}
            totalRecords={lowStockPage.totalRecords}
            totalPages={lowStockPage.totalPages}
            onPageChange={(nextPage) => void loadLowStockProducts(nextPage)}
          />
        </GlassCard>
      </div>

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Customer dues</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Due customer list</h2>
        </div>
        <Table
          data={dueCustomersPage.records}
          emptyText="No outstanding customer balances."
          columns={[
            { key: "customer", header: "Customer", render: (item) => <div><p className="font-semibold text-white">{item.customerName}</p><p className="text-xs text-slate-400">{item.mobile}</p></div> },
            { key: "email", header: "Email", render: (item) => item.email ?? "--" },
            { key: "due", header: "Current Due", className: "text-right", render: (item) => <span className="block text-right font-semibold text-rose-200">{formatCurrency(item.currentBalance)}</span> }
          ]}
        />
        <Pagination
          page={dueCustomersPage.page}
          size={dueCustomersPage.size}
          totalRecords={dueCustomersPage.totalRecords}
          totalPages={dueCustomersPage.totalPages}
          onPageChange={(nextPage) => void loadDueCustomers(nextPage)}
        />
      </GlassCard>
    </div>
  );
};

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Package, ReceiptIndianRupee, Table2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Bar as ChartBar, BarChart as ChartBarChart, CartesianGrid as ChartGrid, Legend as ChartLegend, ResponsiveContainer as ChartContainer, Tooltip as ChartTooltip, XAxis as ChartXAxis, YAxis as ChartYAxis } from "recharts";
import { getExpenseCategories } from "../api/expenseCategories";
import { getExpensesPage, getProfitLossReport, type ExpenseFilterParams } from "../api/expenses";
import { getCustomers } from "../api/customers";
import { getInvoices, getInvoicesPage, type InvoiceFilterParams } from "../api/invoices";
import { Button } from "../components/Button";
import { ListToolbar } from "../components/ListToolbar";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency, formatShortCurrency } from "../lib/currency";
import { ANALYTICS_COLORS } from "../components/analytics/AnalyticsCharts";
import { ProfitWaterfallChart } from "../components/analytics/ProfitWaterfallChart";
import { RankedBarList } from "../components/dashboard/RankedBarList";
import { exportToExcel } from "../lib/excelExport";
import { getChartTheme } from "../lib/chartTheme";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { formatDate } from "../lib/format";
import type { Customer, Expense, ExpenseCategory, Invoice, PageResponse, ProfitLossPoint, ProfitLossReport } from "../types/api";

type DetailType = "revenue" | "expense" | "net";
type DatePreset = "" | "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

type ProfitLossFilters = {
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  expenseType: string;
  categoryId: string;
  customerId: string;
  invoiceId: string;
  createdByRole: string;
};

const emptyReport: ProfitLossReport = { startDate: null, endDate: null, revenue: 0, costOfGoodsSold: 0, expense: 0, grossProfit: 0, netProfit: 0, expenseByCategory: [], revenueVsExpense: [] };
const emptyPage = <T,>(): PageResponse<T> => ({ records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 });

const emptyFilters: ProfitLossFilters = {
  datePreset: "thisYear",
  startDate: "",
  endDate: "",
  expenseType: "",
  categoryId: "",
  customerId: "",
  invoiceId: "",
  createdByRole: ""
};

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" }
];

const toIso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const dateRangeForPreset = (preset: DatePreset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today") return { startDate: toIso(today), endDate: toIso(today) };
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
  if (preset === "thisMonth") return { startDate: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toIso(today) };
  if (preset === "thisYear") return { startDate: toIso(new Date(today.getFullYear(), 0, 1)), endDate: toIso(today) };
  return { startDate: "", endDate: "" };
};

export const ProfitLossReportPage = () => {
  const { setApiError } = useApiMessage();
  const isDark = useIsDarkMode();
  const chart = getChartTheme(isDark);
  const seriesColors = isDark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;
  const [report, setReport] = useState<ProfitLossReport>(emptyReport);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filters, setFilters] = useState<ProfitLossFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<ProfitLossFilters>(emptyFilters);
  const [activeDetail, setActiveDetail] = useState<DetailType | null>(null);
  const [detailPage, setDetailPage] = useState(0);
  const [invoicePage, setInvoicePage] = useState<PageResponse<Invoice>>(emptyPage());
  const [expensePage, setExpensePage] = useState<PageResponse<Expense>>(emptyPage());

  const params = useMemo<ExpenseFilterParams>(() => {
    const dateRange = filters.datePreset === "custom"
      ? { startDate: filters.startDate, endDate: filters.endDate }
      : dateRangeForPreset(filters.datePreset);
    return {
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      expenseType: filters.expenseType || undefined,
      categoryId: filters.categoryId || undefined,
      customerId: filters.customerId || undefined,
      invoiceId: filters.invoiceId || undefined,
      createdByRole: filters.createdByRole || undefined
    };
  }, [filters]);

  const activeFilters = useMemo(() => summarizeFilters(filters, categories, customers, invoices), [categories, customers, filters, invoices]);
  // Chart: costs = maal ki laagat + kharcha; netProfit purane backend par na ho to revenue − costs.
  const monthlyProfit = useMemo(() => {
    const totalRevenue = report.revenueVsExpense.reduce((sum, point) => sum + Number(point.revenue ?? 0), 0);
    return report.revenueVsExpense.map((point) => {
      const revenue = Number(point.revenue ?? 0);
      // Purana backend mahine-wise COGS nahi bhejta: report ki kul COGS revenue ke hisaab se baanto.
      const cogs = point.costOfGoodsSold !== undefined
        ? Number(point.costOfGoodsSold)
        : totalRevenue > 0 ? (Number(report.costOfGoodsSold ?? 0) * revenue) / totalRevenue : 0;
      const costs = cogs + Number(point.expense ?? 0);
      return { label: point.label, revenue, costOfGoodsSold: cogs, expense: Number(point.expense ?? 0), costs, netProfit: point.netProfit !== undefined ? Number(point.netProfit) : revenue - costs };
    });
  }, [report.revenueVsExpense, report.costOfGoodsSold]);
  // Modal/export bhi isi se — purane backend par wahan COGS ₹0 aur net = collections dikhta tha.
  const netRows = monthlyProfit;
  const netPage = useMemo(() => paginate(netRows, detailPage), [detailPage, netRows]);
  const revenueValue = Number(report.revenue ?? 0);
  const marginText = (value: number) => (revenueValue > 0 ? `${((value / revenueValue) * 100).toFixed(1)}% margin` : "No revenue yet");
  const netProfitValue = Number(report.netProfit ?? 0);
  const expenseItems = useMemo(() => {
    const total = report.expenseByCategory.reduce((sum, item) => sum + Number(item.value ?? item.expense ?? 0), 0);
    return report.expenseByCategory
      .map((item, index) => {
        const value = Number(item.value ?? item.expense ?? 0);
        return { id: `${item.label}-${index}`, label: item.label, value, meta: total > 0 ? `${Math.round((value / total) * 100)}%` : undefined };
      })
      .sort((a, b) => b.value - a.value);
  }, [report.expenseByCategory]);
  const statementRows = [
    { label: "Revenue (before GST)", value: formatCurrency(report.revenue), strong: true },
    { label: "− Cost of goods sold", value: formatCurrency(report.costOfGoodsSold) },
    { label: "Gross profit", value: formatCurrency(report.grossProfit), strong: true, negative: Number(report.grossProfit ?? 0) < 0 },
    { label: "− Expenses", value: formatCurrency(report.expense) },
    { label: "Net profit", value: formatCurrency(report.netProfit), strong: true, negative: netProfitValue < 0 }
  ];

  // Perf: filter dropdowns (1000 customers + 1000 invoices) pehle page khulte hi aate the,
  // report se pehle. Ab sirf pehli baar Filter panel khulne par (ek hi baar).
  const filterOptionsRequestedRef = useRef(false);
  const loadFilterOptions = useCallback(() => {
    if (filterOptionsRequestedRef.current) {
      return;
    }
    filterOptionsRequestedRef.current = true;
    void Promise.all([
      getExpenseCategories({ active: true, size: 1000 }).then(setCategories),
      getCustomers({ active: true, size: 1000 }).then(setCustomers),
      getInvoices({ size: 1000 }).then(setInvoices)
    ]).catch((err: any) => {
      // Fail hone par agli baar panel kholne par dobara try.
      filterOptionsRequestedRef.current = false;
      setApiError(err, "Unable to load report filters");
    });
  }, [setApiError]);

  useEffect(() => {
    let cancelled = false;
    // Preset jaldi badalne par purana (slow) response naye report ko overwrite na kare.
    void getProfitLossReport(params)
      .then((reportData) => {
        if (!cancelled) setReport(reportData);
      })
      .catch((err: any) => setApiError(err, "Unable to load profit and loss report"));
    return () => {
      cancelled = true;
    };
  }, [params, setApiError]);

  useEffect(() => {
    if (activeDetail === "revenue") {
      void getInvoicesPage({ ...(params as InvoiceFilterParams), page: detailPage, size: DEFAULT_PAGE_SIZE })
        .then(setInvoicePage)
        .catch((err: any) => setApiError(err, "Unable to load revenue details"));
    }
    if (activeDetail === "expense") {
      void getExpensesPage({ ...params, page: detailPage, size: DEFAULT_PAGE_SIZE })
        .then(setExpensePage)
        .catch((err: any) => setApiError(err, "Unable to load expense details"));
    }
  }, [activeDetail, detailPage, params, setApiError]);

  const openDetail = (type: DetailType) => {
    setActiveDetail(type);
    setDetailPage(0);
  };

  const exportDetail = () => {
    const filterLine = activeFilters.length ? activeFilters : ["All dates"];
    if (activeDetail === "revenue") exportToExcel("profit-loss-revenue.xlsx", invoicePage.records, revenueColumns, { title: "Profit & Loss - Revenue Details", filters: filterLine });
    if (activeDetail === "expense") exportToExcel("profit-loss-expense.xlsx", expensePage.records, expenseColumns, { title: "Profit & Loss - Expense Details", filters: filterLine });
    if (activeDetail === "net") exportToExcel("profit-loss-net.xlsx", netRows, netColumns, {
      title: "Profit & Loss - Monthly Net Profit",
      filters: filterLine,
      summary: [
        { label: "Revenue", value: formatCurrency(report.revenue) },
        { label: "Net Profit", value: formatCurrency(report.netProfit) }
      ]
    });
  };

  // Date preset turant lagta hai (Dashboard jaisa); baaki filters "Apply" par.
  const applyFilters = () => setFilters((current) => ({ ...draftFilters, datePreset: current.datePreset, startDate: current.startDate, endDate: current.endDate }));
  const setDatePreset = (datePreset: DatePreset) => {
    const startDate = datePreset === "custom" ? dateRangeForPreset("thisMonth").startDate : "";
    const endDate = datePreset === "custom" ? dateRangeForPreset("thisMonth").endDate : "";
    setFilters((current) => ({ ...current, datePreset, startDate, endDate }));
    setDraftFilters((current) => ({ ...current, datePreset, startDate, endDate }));
  };

  const resetFilters = () => {
    setDraftFilters((current) => ({ ...emptyFilters, datePreset: current.datePreset, startDate: current.startDate, endDate: current.endDate }));
    setFilters((current) => ({ ...emptyFilters, datePreset: current.datePreset, startDate: current.startDate, endDate: current.endDate }));
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Profit & Loss" subtitle="Revenue, cost of goods, expenses and net profit for the selected period." />
      {/* Dashboard jaisa: date buttons bahar (right), baaki filters "Filter" panel me. */}
      <GlassCard className="p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Filters</p>
            <h2 className="fs-18 mt-1.5 font-semibold text-slate-950">Profit &amp; Loss Filters</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DATE_PRESETS.map(({ value, label }) => (
              <Button key={value} type="button" variant={filters.datePreset === value ? "primary" : "secondary"} onClick={() => setDatePreset(value)}>
                {label}
              </Button>
            ))}
            <ListToolbar
              showSearch={false}
              filtersActiveCount={Math.max(0, activeFilters.length - (filters.datePreset ? 1 : 0))}
              onApplyFilters={applyFilters}
              onCancelFilters={() => setDraftFilters(filters)}
              onResetFilters={resetFilters}
              filterPanelWidth="max-w-[720px]"
              filtersClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            >
              <LoadOnMount onMount={loadFilterOptions} />
              <Select label="Expense Type" value={draftFilters.expenseType} options={[{ label: "All", value: "" }, { label: "General", value: "GENERAL" }, { label: "Customer Related", value: "CUSTOMER_RELATED" }, { label: "Invoice Related", value: "INVOICE_RELATED" }]} onChange={(event) => setDraftFilters((current) => ({ ...current, expenseType: event.target.value }))} />
              <Select label="Category" value={draftFilters.categoryId} options={[{ label: "All", value: "" }, ...categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))]} onChange={(event) => setDraftFilters((current) => ({ ...current, categoryId: event.target.value }))} />
              <Select label="Customer" value={draftFilters.customerId} options={[{ label: "All", value: "" }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]} onChange={(event) => setDraftFilters((current) => ({ ...current, customerId: event.target.value }))} />
              <Select label="Invoice" value={draftFilters.invoiceId} options={[{ label: "All", value: "" }, ...invoices.map((item) => ({ label: item.invoiceNo, value: String(item.id) }))]} onChange={(event) => setDraftFilters((current) => ({ ...current, invoiceId: event.target.value }))} />
              <Select label="Created By" value={draftFilters.createdByRole} options={[{ label: "All", value: "" }, { label: "Owner", value: "OWNER" }, { label: "Admin", value: "ADMIN" }, { label: "User", value: "USER" }]} onChange={(event) => setDraftFilters((current) => ({ ...current, createdByRole: event.target.value }))} />
            </ListToolbar>
          </div>
        </div>
        {filters.datePreset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:max-w-xl">
            <Input label="Start Date" type="date" value={filters.startDate} onChange={(event) => { const value = event.target.value; setFilters((current) => ({ ...current, startDate: value })); setDraftFilters((current) => ({ ...current, startDate: value })); }} />
            <Input label="End Date" type="date" value={filters.endDate} onChange={(event) => { const value = event.target.value; setFilters((current) => ({ ...current, endDate: value })); setDraftFilters((current) => ({ ...current, endDate: value })); }} />
          </div>
        ) : null}
      </GlassCard>

      {/* 5 cards ek row me — pehle 4-column grid me Net Profit akela neeche latakta tha. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Revenue" value={formatCurrency(report.revenue)} caption="Taxable value, before GST" icon={<TrendingUp size={18} />} onClick={() => openDetail("revenue")} />
        <StatCard label="Cost of Goods" value={formatCurrency(report.costOfGoodsSold)} caption="Cost of items sold" icon={<Package size={18} />} />
        <StatCard label="Gross Profit" value={formatCurrency(report.grossProfit)} caption={marginText(Number(report.grossProfit ?? 0))} icon={<TrendingUp size={18} />} />
        <StatCard label="Expenses" value={formatCurrency(report.expense)} caption="Recorded expenses" icon={<ReceiptIndianRupee size={18} />} onClick={() => openDetail("expense")} />
        <StatCard label="Net Profit" value={formatCurrency(report.netProfit)} caption={marginText(netProfitValue)} icon={netProfitValue < 0 ? <TrendingDown size={18} /> : <Wallet size={18} />} onClick={() => openDetail("net")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Where the money went</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Profit breakdown</h2>
          </div>

          <ProfitWaterfallChart revenue={revenueValue} cogs={Number(report.costOfGoodsSold ?? 0)} expense={Number(report.expense ?? 0)} dark={isDark} />
        </GlassCard>
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Statement</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Profit &amp; loss summary</h2>
          </div>
          {/* Waterfall ka table roop — wahi numbers padhne layak. */}
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {statementRows.map((row) => (
              <div key={row.label} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${row.strong ? "bg-slate-50" : ""}`}>
                <dt className={row.strong ? "font-semibold text-slate-800" : "pl-3 text-slate-500"}>{row.label}</dt>
                <dd className={`tabular-nums ${row.strong ? "font-bold text-slate-950" : "text-slate-600"} ${row.negative ? "text-rose-600" : ""}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 mb-3 fs-11 font-semibold uppercase tracking-[0.14em] text-slate-400">Expense by category</p>
          <RankedBarList items={expenseItems} color={seriesColors.expense} emptyText="No expenses recorded in this range." />
        </GlassCard>
      </div>

      {monthlyProfit.length > 1 ? (
      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Revenue vs costs</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Monthly profit</h2>
          </div>
          <Button type="button" variant="secondary" onClick={() => openDetail("net")}><Table2 size={16} />Monthly table</Button>
        </div>
        {/* Net profit = revenue − COGS − expense (cards jaisa). */}
        <div className="h-72">
            <ChartContainer width="100%" height="100%">
              <ChartBarChart data={monthlyProfit} barGap={4} barCategoryGap="30%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <ChartGrid stroke={chart.grid} vertical={false} />
                <ChartXAxis dataKey="label" tick={{ fill: chart.text, fontSize: 11 }} axisLine={{ stroke: chart.grid }} tickLine={false} />
                <ChartYAxis width={52} tickFormatter={(value: number) => formatShortCurrency(value)} tick={{ fill: chart.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <ChartTooltip contentStyle={chart.tooltipContentStyle} itemStyle={chart.tooltipItemStyle} labelStyle={chart.tooltipLabelStyle} cursor={chart.tooltipCursor} formatter={(value: number) => formatCurrency(value)} />
                <ChartLegend iconType="square" wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => <span style={{ color: chart.legend }}>{value}</span>} />
                <ChartBar dataKey="revenue" name="Revenue" fill={seriesColors.billed} maxBarSize={28} radius={[4, 4, 0, 0]} />
                <ChartBar dataKey="costs" name="Costs (goods + expenses)" fill={seriesColors.expense} maxBarSize={28} radius={[4, 4, 0, 0]} />
                <ChartBar dataKey="netProfit" name="Net profit" fill={seriesColors.net} maxBarSize={28} radius={[4, 4, 0, 0]} />
              </ChartBarChart>
            </ChartContainer>
          </div>
      </GlassCard>
      ) : null}

      <Modal open={Boolean(activeDetail)} title={detailTitle(activeDetail)} onClose={() => setActiveDetail(null)}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">{activeFilters.join(" | ") || "No filters applied"}</span>
            <div className="flex flex-wrap items-center gap-3">
              {activeDetail === "revenue" ? <div className="flex justify-end"><Pagination page={invoicePage.page} size={invoicePage.size} totalRecords={invoicePage.totalRecords} totalPages={invoicePage.totalPages} onPageChange={setDetailPage} layout="inline" /></div> : null}
              {activeDetail === "expense" ? <div className="flex justify-end"><Pagination page={expensePage.page} size={expensePage.size} totalRecords={expensePage.totalRecords} totalPages={expensePage.totalPages} onPageChange={setDetailPage} layout="inline" /></div> : null}
              {activeDetail === "net" ? <div className="flex justify-end"><Pagination page={netPage.page} size={netPage.size} totalRecords={netPage.totalRecords} totalPages={netPage.totalPages} onPageChange={setDetailPage} layout="inline" /></div> : null}
              <Button type="button" variant="secondary" onClick={exportDetail}><Download size={16} />Export</Button>
            </div>
          </div>
          {activeDetail === "revenue" ? (
            <>
              <Table data={invoicePage.records} emptyText="No revenue records found." columns={[
                { key: "invoiceNo", header: "Invoice", render: (item) => item.invoiceNo },
                { key: "customer", header: "Customer", render: (item) => item.customerName },
                { key: "date", header: "Date", render: (item) => formatDate(item.invoiceDate) },
                { key: "amount", header: "Revenue (before GST)", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.taxableAmount ?? item.totalAmount)}</span> },
                { key: "total", header: "Invoice total", className: "text-right", render: (item) => <span className="block text-right text-slate-500">{formatCurrency(item.totalAmount)}</span> }
              ]} />
            </>
          ) : null}
          {activeDetail === "expense" ? (
            <>
              <Table data={expensePage.records} emptyText="No expense records found." columns={[
                { key: "category", header: "Category", render: (item) => item.categoryName },
                { key: "type", header: "Type", render: (item) => item.expenseType.replace(/_/g, " ") },
                { key: "date", header: "Date", render: (item) => formatDate(item.expenseDate) },
                { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.amount)}</span> }
              ]} />
            </>
          ) : null}
          {activeDetail === "net" ? (
            <>
              <Table data={netPage.records} emptyText="No net profit rows found." columns={[
                { key: "period", header: "Period", render: (item) => item.label },
                { key: "revenue", header: "Revenue", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.revenue ?? 0)}</span> },
                { key: "cogs", header: "Cost of goods", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.costOfGoodsSold)}</span> },
                { key: "expense", header: "Expense", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.expense)}</span> },
                { key: "net", header: "Net profit", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.netProfit)}</span> }
              ]} />
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

// ListToolbar children sirf panel khulne par mount hote hain — usi waqt dropdown data mangwao.
const LoadOnMount = ({ onMount }: { onMount: () => void }) => {
  useEffect(() => {
    onMount();
  }, [onMount]);
  return null;
};

const summarizeFilters = (filters: ProfitLossFilters, categories: ExpenseCategory[], customers: Customer[], invoices: Invoice[]) => {
  const rows: string[] = [];
  const datePresetLabels: Record<DatePreset, string> = {
    "": "",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",
    thisYear: "This Year",
    custom: "Custom Date"
  };
  if (filters.datePreset === "custom" && (filters.startDate || filters.endDate)) {
    rows.push(`${formatDate(filters.startDate) || "Start"} - ${formatDate(filters.endDate) || "End"}`);
  } else if (filters.datePreset) {
    rows.push(datePresetLabels[filters.datePreset]);
  }
  if (filters.expenseType) rows.push(filters.expenseType.replace(/_/g, " "));
  if (filters.categoryId) rows.push(categories.find((item) => String(item.id) === filters.categoryId)?.categoryName ?? filters.categoryId);
  if (filters.customerId) rows.push(customers.find((item) => String(item.id) === filters.customerId)?.name ?? filters.customerId);
  if (filters.invoiceId) rows.push(invoices.find((item) => String(item.id) === filters.invoiceId)?.invoiceNo ?? filters.invoiceId);
  if (filters.createdByRole) rows.push(`Created By: ${filters.createdByRole}`);
  return rows;
};

const paginate = <T,>(records: T[], page: number): PageResponse<T> => {
  const totalPages = Math.max(1, Math.ceil(records.length / DEFAULT_PAGE_SIZE));
  return {
    records: records.slice(page * DEFAULT_PAGE_SIZE, page * DEFAULT_PAGE_SIZE + DEFAULT_PAGE_SIZE),
    page,
    size: DEFAULT_PAGE_SIZE,
    totalRecords: records.length,
    totalPages
  };
};

const detailTitle = (type: DetailType | null) => {
  if (type === "revenue") return "Revenue Details";
  if (type === "expense") return "Expense Details";
  if (type === "net") return "Net Profit Details";
  return "Profit & Loss Details";
};

const revenueColumns = [
  { key: "invoiceNo", header: "Invoice" },
  { key: "customerName", header: "Customer" },
  { key: "invoiceDate", header: "Date", type: "date" as const },
  { key: "taxableAmount", header: "Revenue (before GST)", type: "amount" as const },
  { key: "totalAmount", header: "Invoice total", type: "amount" as const }
];

const expenseColumns = [
  { key: "categoryName", header: "Category" },
  { key: "expenseType", header: "Type" },
  { key: "expenseDate", header: "Date", type: "date" as const },
  { key: "amount", header: "Amount", type: "amount" as const }
];

const netColumns = [
  { key: "label", header: "Period" },
  { key: "revenue", header: "Revenue", type: "amount" as const },
  { key: "costOfGoodsSold", header: "Cost of goods", type: "amount" as const },
  { key: "expense", header: "Expense", type: "amount" as const },
  { key: "netProfit", header: "Net profit", type: "amount" as const }
];

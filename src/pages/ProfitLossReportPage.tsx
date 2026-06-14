import { useEffect, useMemo, useState } from "react";
import { Download, ReceiptIndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { Bar as ChartBar, BarChart as ChartBarChart, CartesianGrid as ChartGrid, Legend as ChartLegend, ResponsiveContainer as ChartContainer, Tooltip as ChartTooltip, XAxis as ChartXAxis, YAxis as ChartYAxis } from "recharts";
import { getExpenseCategories } from "../api/expenseCategories";
import { getExpensesPage, getProfitLossReport, type ExpenseFilterParams } from "../api/expenses";
import { getCustomers } from "../api/customers";
import { getInvoices, getInvoicesPage, type InvoiceFilterParams } from "../api/invoices";
import { Button } from "../components/Button";
import { CommonAdvancedFilterPanel } from "../components/CommonAdvancedFilterPanel";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
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

const emptyReport: ProfitLossReport = { startDate: null, endDate: null, revenue: 0, expense: 0, netProfit: 0, expenseByCategory: [], revenueVsExpense: [] };
const emptyPage = <T,>(): PageResponse<T> => ({ records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 });

const emptyFilters: ProfitLossFilters = {
  datePreset: "",
  startDate: "",
  endDate: "",
  expenseType: "",
  categoryId: "",
  customerId: "",
  invoiceId: "",
  createdByRole: ""
};

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
  const [report, setReport] = useState<ProfitLossReport>(emptyReport);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ProfitLossFilters>(emptyFilters);
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
  const netRows = report.revenueVsExpense;
  const netPage = useMemo(() => paginate(netRows, detailPage), [detailPage, netRows]);

  useEffect(() => {
    void Promise.all([
      getExpenseCategories({ active: true, size: 1000 }).then(setCategories),
      getCustomers({ active: true, size: 1000 }).then(setCustomers),
      getInvoices({ size: 1000 }).then(setInvoices)
    ]).catch((err: any) => setApiError(err, "Unable to load report filters"));
  }, [setApiError]);

  useEffect(() => {
    void getProfitLossReport(params).then(setReport).catch((err: any) => setApiError(err, "Unable to load profit and loss report"));
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
    if (activeDetail === "revenue") exportToExcel("profit-loss-revenue.xlsx", invoicePage.records, revenueColumns);
    if (activeDetail === "expense") exportToExcel("profit-loss-expense.xlsx", expensePage.records, expenseColumns);
    if (activeDetail === "net") exportToExcel("profit-loss-net.xlsx", netRows, netColumns);
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Profit & Loss" subtitle="Revenue, expense, and net profit reporting with expense attribution filters." />
      <CommonAdvancedFilterPanel
        title="Profit & Loss Filters"
        eyebrow="Report Filters"
        expanded={filtersOpen}
        activeFilters={activeFilters}
        onToggle={() => setFiltersOpen((current) => !current)}
        onClearAll={() => setFilters(emptyFilters)}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select label="Date Range" value={filters.datePreset} options={[
            { label: "All", value: "" },
            { label: "Today", value: "today" },
            { label: "Yesterday", value: "yesterday" },
            { label: "This Week", value: "thisWeek" },
            { label: "This Month", value: "thisMonth" },
            { label: "This Year", value: "thisYear" },
            { label: "Custom Date Range", value: "custom" }
          ]} onChange={(event) => setFilters((current) => ({ ...current, datePreset: event.target.value as DatePreset, startDate: event.target.value === "custom" ? current.startDate : "", endDate: event.target.value === "custom" ? current.endDate : "" }))} />
          {filters.datePreset === "custom" ? (
            <>
              <Input label="Start Date" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
              <Input label="End Date" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
            </>
          ) : null}
          <Select label="Expense Type" value={filters.expenseType} options={[{ label: "All", value: "" }, { label: "General", value: "GENERAL" }, { label: "Customer Related", value: "CUSTOMER_RELATED" }, { label: "Invoice Related", value: "INVOICE_RELATED" }]} onChange={(event) => setFilters((current) => ({ ...current, expenseType: event.target.value }))} />
          <Select label="Category" value={filters.categoryId} options={[{ label: "All", value: "" }, ...categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))} />
          <Select label="Customer" value={filters.customerId} options={[{ label: "All", value: "" }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))} />
          <Select label="Invoice" value={filters.invoiceId} options={[{ label: "All", value: "" }, ...invoices.map((item) => ({ label: item.invoiceNo, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, invoiceId: event.target.value }))} />
          <Select label="Created By" value={filters.createdByRole} options={[{ label: "All", value: "" }, { label: "Owner", value: "OWNER" }, { label: "Admin", value: "ADMIN" }, { label: "User", value: "USER" }]} onChange={(event) => setFilters((current) => ({ ...current, createdByRole: event.target.value }))} />
        </div>
      </CommonAdvancedFilterPanel>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Revenue" value={formatCurrency(report.revenue)} caption="Invoice revenue in selected period" icon={<TrendingUp size={18} />} onClick={() => openDetail("revenue")} />
        <StatCard label="Expense" value={formatCurrency(report.expense)} caption="Recorded expenses in selected period" icon={<ReceiptIndianRupee size={18} />} onClick={() => openDetail("expense")} />
        <StatCard label="Net Profit" value={formatCurrency(report.netProfit)} caption="Revenue minus expense" icon={<TrendingDown size={18} />} onClick={() => openDetail("net")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase text-slate-400">Revenue vs Expense</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Net profit trend</h2>
          </div>
          <div className="h-80">
            <ChartContainer width="100%" height="100%">
              <ChartBarChart data={report.revenueVsExpense}>
                <ChartGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <ChartXAxis dataKey="label" stroke="#94a3b8" />
                <ChartYAxis stroke="#94a3b8" />
                <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                <ChartLegend />
                <ChartBar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                <ChartBar dataKey="expense" name="Expense" fill="#f97316" radius={[8, 8, 0, 0]} />
                <ChartBar dataKey="netRevenue" name="Net Profit" fill="#10b981" radius={[8, 8, 0, 0]} />
              </ChartBarChart>
            </ChartContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase text-slate-400">Expense Summary</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Expense by category</h2>
          </div>
          <Table data={report.expenseByCategory} emptyText="No expense data in this range." columns={[
            { key: "category", header: "Category", render: (item) => item.label },
            { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold text-slate-950">{formatCurrency(item.value ?? item.expense ?? 0)}</span> }
          ]} />
        </GlassCard>
      </div>

      <Modal open={Boolean(activeDetail)} title={detailTitle(activeDetail)} onClose={() => setActiveDetail(null)}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-700">{activeFilters.join(" | ") || "No filters applied"}</span>
            <Button type="button" variant="secondary" onClick={exportDetail}><Download size={16} />Export</Button>
          </div>
          {activeDetail === "revenue" ? (
            <>
              <Table data={invoicePage.records} emptyText="No revenue records found." columns={[
                { key: "invoiceNo", header: "Invoice", render: (item) => item.invoiceNo },
                { key: "customer", header: "Customer", render: (item) => item.customerName },
                { key: "date", header: "Date", render: (item) => formatDate(item.invoiceDate) },
                { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.totalAmount)}</span> }
              ]} />
              <Pagination page={invoicePage.page} size={invoicePage.size} totalRecords={invoicePage.totalRecords} totalPages={invoicePage.totalPages} onPageChange={setDetailPage} />
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
              <Pagination page={expensePage.page} size={expensePage.size} totalRecords={expensePage.totalRecords} totalPages={expensePage.totalPages} onPageChange={setDetailPage} />
            </>
          ) : null}
          {activeDetail === "net" ? (
            <>
              <Table data={netPage.records} emptyText="No net profit rows found." columns={[
                { key: "period", header: "Period", render: (item) => item.label },
                { key: "revenue", header: "Revenue", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.revenue ?? 0)}</span> },
                { key: "expense", header: "Expense", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.expense ?? 0)}</span> },
                { key: "net", header: "Net", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.netRevenue ?? 0)}</span> }
              ]} />
              <Pagination page={netPage.page} size={netPage.size} totalRecords={netPage.totalRecords} totalPages={netPage.totalPages} onPageChange={setDetailPage} />
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
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
  { key: "totalAmount", header: "Amount", type: "amount" as const }
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
  { key: "expense", header: "Expense", type: "amount" as const },
  { key: "netRevenue", header: "Net", type: "amount" as const }
];

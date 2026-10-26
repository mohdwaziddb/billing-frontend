import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, PieChart as PieChartIcon, ReceiptText, UsersRound } from "lucide-react";
import { getCustomerDueList, getLowStockProducts, getOwnerAnalytics } from "../api/analytics";
import { getCustomersPage } from "../api/customers";
import { getExpensesPage } from "../api/expenses";
import { getInvoicesPage } from "../api/invoices";
import { getPaymentsPage } from "../api/payments";
import { ANALYTICS_COLORS, CashFlowChart, MoneyFlow, MonthlyRevenueChart, ReceivablesChart } from "../components/analytics/AnalyticsCharts";
import { Button } from "../components/Button";
import { CommonDashboardDetailModal, type DashboardDetailModalColumn } from "../components/CommonDashboardDetailModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { StatCard } from "../components/StatCard";
import { RankedBarList } from "../components/dashboard/RankedBarList";
import { Table } from "../components/Table";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import { buildChartPeriods } from "../lib/chartPeriods";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import type { Customer, CustomerDue, Expense, Invoice, LowStockProduct, OwnerAnalytics, PageResponse, Payment } from "../types/api";

type DatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";
type AnalyticsDrilldownKey = "revenue" | "collections" | "outstanding" | "expenses" | "customers";
type AnalyticsDrilldownRow = Invoice | Payment | Expense | Customer;

const SEARCH_DEBOUNCE_MS = 350;

const emptyDetailPage: PageResponse<AnalyticsDrilldownRow> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

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

export const SalesAnalyticsPage = () => {
  const dark = useIsDarkMode();
  const colors = dark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;
  const [overview, setOverview] = useState<OwnerAnalytics | null>(null);
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
  const [activeDrilldown, setActiveDrilldown] = useState<AnalyticsDrilldownKey | null>(null);
  const [drilldownPage, setDrilldownPage] = useState<PageResponse<AnalyticsDrilldownRow>>(emptyDetailPage);
  const [drilldownPageNumber, setDrilldownPageNumber] = useState(0);
  const [drilldownSearch, setDrilldownSearch] = useState("");
  const [debouncedDrilldownSearch, setDebouncedDrilldownSearch] = useState("");
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);

  // Perf: overview hi date range par chalta hai. Low stock / due customers range-independent
  // hain — pehle har preset click par teeno dobara aate the, aur Promise.all sabse slow call
  // tak poora page roke rakhta tha. `cancelled` = purane preset ka late response overwrite na kare.
  useEffect(() => {
    let cancelled = false;
    void getOwnerAnalytics(activeRange).then((ownerData) => {
      if (!cancelled) setOverview(ownerData);
    });
    return () => {
      cancelled = true;
    };
  }, [activeRange]);

  useEffect(() => {
    void getLowStockProducts({ page: 0, size: DEFAULT_PAGE_SIZE }).then(setLowStockPage);
    void getCustomerDueList({ page: 0, size: DEFAULT_PAGE_SIZE }).then(setDueCustomersPage);
  }, []);

  // Drilldown search: har keystroke par API nahi, thoda rukne par.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDrilldownSearch(drilldownSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [drilldownSearch]);

  const loadLowStockProducts = async (page: number) => {
    setLowStockPage(await getLowStockProducts({ page, size: DEFAULT_PAGE_SIZE }));
  };

  const loadDueCustomers = async (page: number) => {
    setDueCustomersPage(await getCustomerDueList({ page, size: DEFAULT_PAGE_SIZE }));
  };

  const openDrilldown = (key: AnalyticsDrilldownKey) => {
    setActiveDrilldown(key);
    setDrilldownPageNumber(0);
    setDrilldownSearch("");
    setDebouncedDrilldownSearch("");
  };

  // Trend buckets ki asli dates (backend label "15" / "Oct" par nirbhar nahi). Series index se jodo.
  const periods = useMemo(
    () => buildChartPeriods(overview?.startDate ?? activeRange.startDate, overview?.endDate ?? activeRange.endDate, overview?.salesTrend.length ?? 0),
    [overview, activeRange]
  );
  const periodAt = (position: number, fallback: string) => ({
    axisLabel: periods?.[position]?.axisLabel ?? fallback,
    fullLabel: periods?.[position]?.fullLabel ?? fallback
  });
  const cashFlow = useMemo(
    () => (overview?.collectionTrend ?? []).map((point, position) => ({
      ...periodAt(position, point.label),
      collected: Number(point.value ?? 0),
      expense: Number(overview?.expenseTrend[position]?.value ?? 0)
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overview, periods]
  );
  const receivables = useMemo(
    () => (overview?.outstandingTrend ?? []).map((point, position) => ({ ...periodAt(position, point.label), value: Number(point.value ?? 0) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overview, periods]
  );
  // monthlyRevenue: end date tak ke 12 mahine, label "Oct 2026".
  const monthlyRevenue = useMemo(
    () => (overview?.monthlyRevenue ?? []).map((point) => {
      const [monthName, year] = String(point.label).split(" ");
      // Axis par sirf mahina; saal sirf January par (12 labels "Nov 25Dec 25…" chipak jaate the).
      const axisLabel = monthName === "Jan" && year ? `Jan '${year.slice(-2)}` : monthName;
      return { axisLabel, fullLabel: point.label, value: Number(point.value ?? 0) };
    }),
    [overview]
  );

  const executiveKpis = useMemo(() => {
    const sales = Number(overview?.totalSales ?? 0);
    const collections = Number(overview?.totalCollection ?? 0);
    const expense = Number(overview?.totalExpense ?? 0);
    const outstanding = Number(overview?.outstandingAmount ?? 0);
    const invoices = Number(overview?.totalInvoices ?? 0);
    const start = new Date(`${activeRange.startDate}T00:00:00`);
    const end = new Date(`${activeRange.endDate}T00:00:00`);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    // DSO = outstanding ÷ (period ki billing ÷ din). Pehle "outstanding ÷ (collections ÷ 30)"
    // tha — har range ko 30 din maanta tha aur data na ho to bhi "1 days" dikhata.
    const dso = sales > 0 ? outstanding / (sales / days) : null;
    return {
      collectionEfficiency: sales > 0 ? `${((collections / sales) * 100).toFixed(1)}%` : "—",
      averageInvoiceValue: invoices > 0 ? formatCurrency(sales / invoices) : "—",
      invoiceCount: invoices,
      dso: dso === null ? "—" : `${dso < 10 ? dso.toFixed(1) : Math.round(dso)} days`,
      customerGrowth: `${overview?.newCustomers ?? 0}`,
      // Pehle "Recovery rate" = collections ÷ (collections + all-time outstanding): do alag scope mix.
      expenseRatio: collections > 0 ? `${((expense / collections) * 100).toFixed(1)}%` : expense > 0 ? "—" : "0%"
    };
  }, [overview, activeRange]);

  const drilldownColumns = useMemo<DashboardDetailModalColumn<AnalyticsDrilldownRow>[]>(() => {
    if (activeDrilldown === "collections") {
      return [
        { key: "id", header: "Payment Ref", value: (row) => `PAY-${String((row as Payment).id).padStart(6, "0")}` },
        { key: "customerName", header: "Customer" },
        { key: "invoiceNo", header: "Invoice" },
        { key: "amount", header: "Amount", type: "currency", className: "text-right" },
        { key: "paymentDate", header: "Payment Date", type: "date" },
        { key: "mode", header: "Mode" },
        { key: "createdBy", header: "Created By" }
      ];
    }
    if (activeDrilldown === "expenses") {
      return [
        { key: "expenseType", header: "Expense Type" },
        { key: "categoryName", header: "Category" },
        { key: "customerName", header: "Customer" },
        { key: "invoiceNo", header: "Invoice" },
        { key: "amount", header: "Amount", type: "currency", className: "text-right" },
        { key: "expenseDate", header: "Date", type: "date" },
        { key: "description", header: "Description" }
      ];
    }
    if (activeDrilldown === "customers") {
      return [
        { key: "name", header: "Customer" },
        { key: "mobile", header: "Mobile" },
        { key: "email", header: "Email" },
        { key: "totalPurchaseAmount", header: "Purchase", type: "currency", className: "text-right" },
        { key: "totalPaidAmount", header: "Paid", type: "currency", className: "text-right" },
        { key: "outstandingBalance", header: "Outstanding", type: "currency", className: "text-right" },
        { key: "active", header: "Status", value: (row) => ((row as Customer).active ? "Active" : "Inactive") }
      ];
    }
    return [
      { key: "invoiceNo", header: "Invoice" },
      { key: "customerName", header: "Customer" },
      { key: "invoiceDate", header: "Date", type: "date" },
      { key: "totalAmount", header: "Total", type: "currency", className: "text-right" },
      { key: "paidAmount", header: "Paid", type: "currency", className: "text-right" },
      { key: "balanceAmount", header: "Outstanding", type: "currency", className: "text-right" },
      { key: "paymentStatus", header: "Status", type: "status" }
    ];
  }, [activeDrilldown]);

  const drilldownTitle = activeDrilldown === "collections"
    ? "Collection Details"
    : activeDrilldown === "outstanding"
      ? "Outstanding Invoice Details"
      : activeDrilldown === "expenses"
        ? "Expense Details"
        : activeDrilldown === "customers"
          ? "Customer Details"
          : "Revenue Invoice Details";
  const drilldownFilters = useMemo(() => {
    const rangeLabel = `${formatDate(activeRange.startDate)} - ${formatDate(activeRange.endDate)}`;
    if (activeDrilldown === "customers") {
      return ["Customer records"];
    }
    if (activeDrilldown === "outstanding") {
      return [`Outstanding invoices`, `Date: ${rangeLabel}`];
    }
    return [`Date: ${rangeLabel}`];
  }, [activeDrilldown, activeRange]);
  const drilldownGrandTotal = useMemo(() => {
    const total = drilldownPage.records.reduce((sum, row) => {
      if (activeDrilldown === "collections") return sum + Number((row as Payment).amount ?? 0);
      if (activeDrilldown === "expenses") return sum + Number((row as Expense).amount ?? 0);
      if (activeDrilldown === "customers") return sum + Number((row as Customer).outstandingBalance ?? 0);
      return sum + Number((row as Invoice).totalAmount ?? 0);
    }, 0);
    return formatCurrency(total);
  }, [activeDrilldown, drilldownPage.records]);

  useEffect(() => {
    if (!activeDrilldown) {
      return;
    }
    let cancelled = false;
    setDrilldownLoading(true);
    const commonParams = { search: debouncedDrilldownSearch || undefined, page: drilldownPageNumber, size: DEFAULT_PAGE_SIZE };
    const request = activeDrilldown === "collections"
      ? getPaymentsPage({ ...commonParams, startDate: activeRange.startDate, endDate: activeRange.endDate })
      : activeDrilldown === "expenses"
        ? getExpensesPage({ ...commonParams, startDate: activeRange.startDate, endDate: activeRange.endDate })
        : activeDrilldown === "customers"
          ? getCustomersPage({ search: debouncedDrilldownSearch || undefined, page: drilldownPageNumber, size: DEFAULT_PAGE_SIZE })
          : getInvoicesPage({
            ...commonParams,
            startDate: activeRange.startDate,
            endDate: activeRange.endDate,
            outstandingFilter: activeDrilldown === "outstanding" ? "OUTSTANDING" : undefined
          });
    void request
      .then((response) => {
        if (!cancelled) setDrilldownPage(response as PageResponse<AnalyticsDrilldownRow>);
      })
      .finally(() => {
        if (!cancelled) setDrilldownLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeDrilldown, activeRange, drilldownPageNumber, debouncedDrilldownSearch]);

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Analytics"
        subtitle="Cash flow, receivables, 12-month revenue and stock alerts for the selected period."
      />

      <GlassCard className="p-6 md:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Executive Analytics</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Business health command center</h2>
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
        <StatCard label="Collection Efficiency" value={executiveKpis.collectionEfficiency} caption="Collected ÷ billed" icon={<Gauge size={18} />} onClick={() => openDrilldown("collections")} />
        <StatCard label="Avg Invoice Value" value={executiveKpis.averageInvoiceValue} caption={`Across ${executiveKpis.invoiceCount} invoice${executiveKpis.invoiceCount === 1 ? "" : "s"}`} icon={<ReceiptText size={18} />} onClick={() => openDrilldown("revenue")} />
        <StatCard label="Days Sales Outstanding" value={executiveKpis.dso} caption="Outstanding ÷ daily billing" icon={<Activity size={18} />} onClick={() => openDrilldown("outstanding")} />
        <StatCard label="New Customers" value={executiveKpis.customerGrowth} caption="Added in this period" icon={<UsersRound size={18} />} onClick={() => openDrilldown("customers")} />
        <StatCard label="Expense Ratio" value={executiveKpis.expenseRatio} caption="Expenses ÷ collected" icon={<PieChartIcon size={18} />} onClick={() => openDrilldown("expenses")} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-4">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Cash flow</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Cash in vs cash out</h2>
          </div>
          <CashFlowChart data={cashFlow} dark={dark} />
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Money flow</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Where this period's money went</h2>
          </div>
          <MoneyFlow billed={Number(overview?.totalSales ?? 0)} collected={Number(overview?.totalCollection ?? 0)} expense={Number(overview?.totalExpense ?? 0)} dark={dark} />
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-4">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Revenue trend</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Last 12 months billing</h2>
          </div>
          <MonthlyRevenueChart data={monthlyRevenue} dark={dark} />
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-4">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Receivables</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Outstanding balance over the period</h2>
          </div>
          <ReceivablesChart data={receivables} dark={dark} />
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Expense by category</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Where spend is going</h2>
          </div>
          <RankedBarList
            color={colors.expense}
            emptyText="No expenses recorded in this period."
            items={(overview?.expenseByCategory ?? []).map((item) => ({ id: item.label, label: item.label, value: Number(item.value ?? 0) }))}
          />
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Inventory alert</p>
              <h2 className="mt-2 fs-18 font-semibold text-white">Low stock products</h2>
            </div>
            <Pagination
              page={lowStockPage.page}
              size={lowStockPage.size}
              totalRecords={lowStockPage.totalRecords}
              totalPages={lowStockPage.totalPages}
              onPageChange={(nextPage) => void loadLowStockProducts(nextPage)}
            layout="inline" />
          </div>
          {lowStockPage.records.length ? (
            <ul className="space-y-3">
              {lowStockPage.records.map((item) => {
                const stock = Number(item.stockQty ?? 0);
                const min = Math.max(1, Number(item.minStockQty ?? 0));
                const level = Math.min(100, (stock / min) * 100);
                return (
                  <li key={item.productId ?? item.sku} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate fs-13 font-semibold text-slate-800">{item.productName} <span className="ml-1 fs-11 font-normal text-slate-400">{item.sku}</span></p>
                      <p className="shrink-0 fs-12 text-slate-500"><span className={`font-bold ${stock <= 0 ? "text-rose-600" : "text-amber-700 dark:text-amber-300"}`}>{stock}</span> / min {item.minStockQty}</p>
                    </div>
                    {/* Meter: track same ramp ka halka step; stock min ke kitna kareeb hai. */}
                    <div className="mt-2 h-2 rounded-full" style={{ background: "color-mix(in srgb, #eda100 18%, transparent)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(2, level)}%`, background: stock <= 0 ? colors.due : "#eda100" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">All products are above their minimum stock.</div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Customer dues</p>
            <h2 className="mt-2 fs-18 font-semibold text-white">Due customer list</h2>
          </div>
          <Pagination
            page={dueCustomersPage.page}
            size={dueCustomersPage.size}
            totalRecords={dueCustomersPage.totalRecords}
            totalPages={dueCustomersPage.totalPages}
            onPageChange={(nextPage) => void loadDueCustomers(nextPage)}
          layout="inline" />
        </div>
        <Table
          data={dueCustomersPage.records}
          minHeightClass="min-h-0"
          emptyText="No outstanding customer balances."
          columns={[
            { key: "customer", header: "Customer", render: (item) => <div><p className="font-semibold text-white">{item.customerName}</p><p className="text-xs text-slate-400">{item.mobile}</p></div> },
            { key: "email", header: "Email", render: (item) => item.email ?? "--" },
            { key: "due", header: "Current Due", className: "text-right", render: (item) => <span className="block whitespace-nowrap text-right font-semibold text-rose-600">{formatCurrency(item.currentBalance)}</span> }
          ]}
        />
      </GlassCard>
      <CommonDashboardDetailModal
        open={Boolean(activeDrilldown)}
        title={drilldownTitle}
        rows={drilldownPage.records}
        columns={drilldownColumns}
        loading={drilldownLoading}
        search={drilldownSearch}
        page={drilldownPage.page}
        totalRecords={drilldownPage.totalRecords}
        totalPages={drilldownPage.totalPages}
        activeFilters={drilldownFilters}
        grandTotal={drilldownGrandTotal}
        emptyText="No detail records found for this card."
        onClose={() => setActiveDrilldown(null)}
        onSearchChange={(value) => {
          setDrilldownPageNumber(0);
          setDrilldownSearch(value);
        }}
        onPageChange={setDrilldownPageNumber}
        onExport={() => exportToExcel(`${activeDrilldown ?? "analytics"}-details.xlsx`, drilldownPage.records, drilldownColumns.map((column) => ({
          key: column.key,
          header: column.header,
          value: column.value,
          type: column.type === "currency" ? "amount" : column.type === "date" ? "date" : undefined
        })))}
      />
    </div>
  );
};

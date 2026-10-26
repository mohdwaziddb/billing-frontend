import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { Banknote, Boxes, ChevronDown, ChevronUp, CreditCard, Download, FileText, Search, TrendingUp, Users, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getCustomerDueList, getOwnerAnalytics, getSalesByCategoryDetails, getTopProducts } from "../api/analytics";
import { getDashboardDetails, getDashboardSummary } from "../api/dashboard";
import { getInvoicesPage } from "../api/invoices";
import { Button } from "../components/Button";
import { CommonDashboardDetailModal, type DashboardDetailModalColumn } from "../components/CommonDashboardDetailModal";
import { RankedBarList } from "../components/dashboard/RankedBarList";
import { SALES_COLLECTION_COLORS, SalesCollectionsChart, type SalesCollectionsPoint } from "../components/dashboard/SalesCollectionsChart";
import { Header } from "../components/Header";
import { MfaEnrollBanner } from "../components/MfaEnrollBanner";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { StatCard, type StatGrowthTone } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { formatAmount, formatCompactCurrency, formatCurrency, formatShortCurrency } from "../lib/currency";
import { getChartTheme } from "../lib/chartTheme";
import { buildChartPeriods } from "../lib/chartPeriods";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import type { CustomerDue, DashboardCardKey, DashboardDetail, DashboardDetailRow, DashboardSummary, Invoice, MetricPoint, OwnerAnalytics, PageResponse, SalesByCategory, TopSellingProduct } from "../types/api";

type DatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";
type DashboardListKey = "recentInvoices" | "topCustomers" | "topProducts" | "salesByCategory" | "outstandingCustomers";

type DetailColumn = {
  key: string;
  header: string;
  type?: "currency" | "date" | "status";
  sortable?: boolean;
};

const DASHBOARD_ROW_LIMIT = 7;
const DASHBOARD_MODAL_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" }
];


// Validated categorical order (dataviz reference palette, fixed order — kabhi cycle nahi).
// Sales / collections cards aur main chart ek hi rang use karte hain taaki identity sab jagah same rahe.
const CHART_COLORS = {
  sales: SALES_COLLECTION_COLORS.light.sales,
  collection: SALES_COLLECTION_COLORS.light.collections,
  outstanding: "#e34948",
  customers: "#6250d6",
  products: "#eb6834",
  palette: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"]
};

const OUTSTANDING_WIDGET_COLORS = {
  collected: "#16a34a",
  outstanding: "#dc2626",
  remaining: "#f97316"
};

// List top 7 tak hi hai (DASHBOARD_ROW_LIMIT) = 7 validated slots; index ke bahar kabhi naya rang nahi banta.
const categoryColorFor = (_categoryName: string, index: number) => CHART_COLORS.palette[Math.min(index, CHART_COLORS.palette.length - 1)];

const detailConfig: Record<DashboardCardKey, { title: string; columns: DetailColumn[]; defaultSort: string }> = {
  totalSales: {
    title: "Total Sales Details",
    defaultSort: "invoiceDate",
    columns: [
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "productName", header: "Product/Item Name", sortable: true },
      { key: "quantity", header: "Quantity", sortable: true },
      { key: "totalAmount", header: "Total Amount", type: "currency", sortable: true },
      { key: "invoiceDate", header: "Invoice Date", type: "date", sortable: true }
    ]
  },
  collections: {
    title: "Collections Details",
    defaultSort: "paymentDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "collectedAmount", header: "Collected Amount", type: "currency", sortable: true },
      { key: "paymentDate", header: "Payment Date", type: "date", sortable: true },
      { key: "paymentMethod", header: "Payment Method", sortable: true }
    ]
  },
  outstanding: {
    title: "Outstanding Details",
    defaultSort: "dueDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "invoiceAmount", header: "Invoice Amount", type: "currency", sortable: true },
      { key: "paidAmount", header: "Paid Amount", type: "currency", sortable: true },
      { key: "outstandingAmount", header: "Outstanding Amount", type: "currency", sortable: true },
      { key: "dueDate", header: "Due Date", type: "date", sortable: true }
    ]
  },
  totalExpense: {
    title: "Total Expense Details",
    defaultSort: "expenseDate",
    columns: [
      { key: "expenseType", header: "Expense Type", sortable: true },
      { key: "categoryName", header: "Category", sortable: true },
      { key: "customerName", header: "Customer", sortable: true },
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "amount", header: "Amount", type: "currency", sortable: true },
      { key: "expenseDate", header: "Expense Date", type: "date", sortable: true },
      { key: "description", header: "Description", sortable: true }
    ]
  },
  netRevenue: {
    title: "Net Revenue Details",
    defaultSort: "date",
    columns: [
      { key: "date", header: "Date", type: "date", sortable: true },
      { key: "totalRevenue", header: "Total Collection", type: "currency", sortable: true },
      { key: "totalExpense", header: "Total Expense", type: "currency", sortable: true },
      { key: "netRevenue", header: "Net Revenue", type: "currency", sortable: true }
    ]
  },
  customers: {
    title: "Total Customers Details",
    defaultSort: "lastPurchaseDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "mobile", header: "Mobile", sortable: true },
      { key: "invoiceCount", header: "Invoice Count", sortable: true },
      { key: "totalPurchaseAmount", header: "Total Purchase Amount", type: "currency", sortable: true },
      { key: "outstandingAmount", header: "Outstanding Amount", type: "currency", sortable: true },
      { key: "lastPurchaseDate", header: "Last Purchase Date", type: "date", sortable: true }
    ]
  },
  newCustomers: {
    title: "New Customers Details",
    defaultSort: "firstPurchaseDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "firstPurchaseDate", header: "First Purchase Date", type: "date", sortable: true },
      { key: "invoiceCount", header: "Invoice Count", sortable: true },
      { key: "totalPurchaseAmount", header: "Total Purchase Amount", type: "currency", sortable: true }
    ]
  },
  existingCustomers: {
    title: "Existing Customers Details",
    defaultSort: "lastPurchaseDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "customerCreatedDate", header: "Customer Created Date", type: "date", sortable: true },
      { key: "lastPurchaseDate", header: "Last Purchase Date", type: "date", sortable: true },
      { key: "invoiceCount", header: "Invoice Count", sortable: true },
      { key: "totalPurchaseAmount", header: "Total Purchase Amount", type: "currency", sortable: true },
      { key: "outstandingAmount", header: "Outstanding Amount", type: "currency", sortable: true }
    ]
  },
  invoices: {
    title: "Invoice Details",
    defaultSort: "invoiceDate",
    columns: [
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "invoiceDate", header: "Invoice Date", type: "date", sortable: true },
      { key: "invoiceAmount", header: "Invoice Amount", type: "currency", sortable: true },
      { key: "status", header: "Status", type: "status", sortable: true }
    ]
  },
  products: {
    title: "Product-wise Sales Summary",
    defaultSort: "totalRevenue",
    columns: [
      { key: "productName", header: "Product Name", sortable: true },
      { key: "quantitySold", header: "Quantity Sold", sortable: true },
      { key: "totalRevenue", header: "Total Revenue", type: "currency", sortable: true },
      { key: "numberOfInvoices", header: "Number of Invoices", sortable: true }
    ]
  }
};

const formatCell = (row: DashboardDetailRow, column: DetailColumn) => {
  const value = row[column.key];
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (column.type === "currency") {
    return formatAmount(Number(value ?? 0));
  }
  if (column.type === "date") {
    return formatDate(String(value ?? ""));
  }
  return String(value).replace(/_/g, " ");
};

const toExcelCellValue = (value: unknown): string | number | Date | null | undefined => {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Date || typeof value === "string" || typeof value === "number") {
    return value;
  }
  return String(value);
};

const isTotalColumn = (column: DetailColumn) => {
  if (column.type === "currency") {
    return true;
  }
  return /(amount|total|count|quantity|qty|paid|outstanding|collected|revenue)/i.test(column.key)
    && column.type !== "date"
    && column.type !== "status";
};

const buildGrandTotalRow = (rows: DashboardDetailRow[], columns: DetailColumn[]) => {
  if (!rows.length || !columns.some(isTotalColumn)) {
    return null;
  }
  const totalRow: DashboardDetailRow = { __rowType: "grandTotal" };
  columns.forEach((column, index) => {
    if (index === 0) {
      totalRow[column.key] = "Grand Total";
      return;
    }
    if (isTotalColumn(column)) {
      totalRow[column.key] = rows.reduce((sum, row) => sum + Number(row[column.key] ?? 0), 0);
      return;
    }
    totalRow[column.key] = null;
  });
  return totalRow;
};

const emptyPage = <T,>(): PageResponse<T> => ({
  records: [],
  page: 0,
  size: DASHBOARD_MODAL_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
});

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

/**
 * vs previous period. null = pichhle period me kuch nahi tha (backend % nahi deta):
 * current > 0 ho to "New", warna kuch nahi.
 */
const formatTrend = (value: number | null | undefined, current?: number | null) => {
  if (value === null || value === undefined) {
    return Number(current ?? 0) > 0 ? "New" : undefined;
  }
  const safeValue = Number(value);
  if (safeValue === 0) {
    return "0%";
  }
  const rounded = Math.abs(safeValue) >= 100 ? safeValue.toFixed(0) : safeValue.toFixed(1);
  return `${safeValue > 0 ? "+" : ""}${rounded}%`;
};

/** Up hamesha accha nahi: Outstanding badhna = bad. */
const trendTone = (value: number | null | undefined, upIsGood: boolean): StatGrowthTone => {
  if (value === null || value === undefined || Number(value) === 0) {
    return "neutral";
  }
  return (Number(value) > 0) === upIsGood ? "good" : "bad";
};

/** Card sparkline: period ka running total (ek din ki spike ke bajaye "ab tak kitna"). */
const cumulative = (points?: MetricPoint[]) => {
  let running = 0;
  return (points ?? []).map((point) => {
    running += Number(point.value ?? 0);
    return running;
  });
};

const shiftIsoDate = (iso: string, days: number) => {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};


type DashboardListRow = Invoice | DashboardDetailRow | TopSellingProduct | SalesByCategory | CustomerDue;

const dashboardListConfig: Record<DashboardListKey, {
  title: string;
  columns: DashboardDetailModalColumn<DashboardListRow>[];
  totalKey?: string;
  emptyText: string;
}> = {
  recentInvoices: {
    title: "Billing Activity",
    totalKey: "balanceAmount",
    emptyText: "No invoices found for this range.",
    columns: [
      { key: "invoiceNo", header: "Invoice No" },
      { key: "customerName", header: "Customer Name" },
      { key: "invoiceDate", header: "Invoice Date", type: "date" },
      { key: "paymentStatus", header: "Status", type: "status" },
      { key: "totalAmount", header: "Invoice Amount", type: "currency", className: "text-right" },
      { key: "balanceAmount", header: "Balance", type: "currency", className: "text-right" }
    ]
  },
  topCustomers: {
    title: "Highest Sales Contribution",
    totalKey: "totalPurchaseAmount",
    emptyText: "No customer activity found for this range.",
    columns: [
      { key: "customerName", header: "Customer Name" },
      { key: "mobile", header: "Mobile" },
      { key: "invoiceCount", header: "Invoice Count" },
      { key: "totalPurchaseAmount", header: "Sales", type: "currency", className: "text-right" },
      { key: "outstandingAmount", header: "Outstanding", type: "currency", className: "text-right" },
      { key: "lastPurchaseDate", header: "Last Purchase", type: "date" }
    ]
  },
  topProducts: {
    title: "Top Selling Products",
    totalKey: "totalSalesAmount",
    emptyText: "No product sales found for this range.",
    columns: [
      { key: "productName", header: "Product Name" },
      { key: "sku", header: "SKU" },
      { key: "totalQtySold", header: "Qty Sold", className: "text-right" },
      { key: "totalSalesAmount", header: "Sales", type: "currency", className: "text-right" },
      { key: "currentStockQty", header: "Current Stock", className: "text-right" }
    ]
  },
  salesByCategory: {
    title: "Sales By Category Details",
    totalKey: "totalAmount",
    emptyText: "No category sales found for this range.",
    columns: [
      { key: "categoryName", header: "Category" },
      { key: "totalAmount", header: "Sales", type: "currency", className: "text-right" },
      { key: "percentage", header: "Share %", className: "text-right", value: (row) => `${Number((row as SalesByCategory).percentage ?? 0).toFixed(2)}%` }
    ]
  },
  outstandingCustomers: {
    title: "Outstanding Customer Details",
    totalKey: "currentBalance",
    emptyText: "No outstanding customers found.",
    columns: [
      { key: "customerName", header: "Customer Name" },
      { key: "mobile", header: "Mobile" },
      { key: "email", header: "Email" },
      { key: "currentBalance", header: "Outstanding", type: "currency", className: "text-right" }
    ]
  }
};

const buildListTotalRow = (rows: DashboardListRow[], config: { columns: DashboardDetailModalColumn<DashboardListRow>[]; totalKey?: string }) => {
  const totalRow: Record<string, string | number | null> = { __rowType: "grandTotal" };
  config.columns.forEach((column, index) => {
    if (index === 0) {
      totalRow[column.key] = "Grand Total";
      return;
    }
    totalRow[column.key] = column.key === config.totalKey
      ? rows.reduce((sum, row) => sum + Number((row as Record<string, unknown>)[column.key] ?? 0), 0)
      : null;
  });
  return totalRow;
};

const Panel = ({ className = "", children }: { className?: string; children: ReactNode }) => (
  <section className={`rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] ${className}`}>
    {children}
  </section>
);

const DashboardCompactCard = ({
  label,
  value,
  caption,
  icon,
  accentColor = "var(--theme-color)",
  meta,
  onClick
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: ReactNode;
  accentColor?: string;
  meta?: Array<{ label: string; value: string | number }>;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="group h-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--compact-accent)_30%,#e2e8f0)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--compact-accent)_34%,transparent)]"
    style={{ "--compact-accent": accentColor } as CSSProperties}
    onClick={onClick}
  >
    <span className="flex min-h-[104px] flex-col justify-between gap-2.5">
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="fs-11 block truncate font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
          <span className="fs-24 mt-1.5 block font-extrabold leading-none text-slate-950">{value}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--compact-accent)_11%,white)] text-[var(--compact-accent)]">
          {icon}
        </span>
      </span>
      <span className="block min-w-0">
        <span className="fs-11 block truncate font-medium text-slate-500">{caption}</span>
        {meta?.length ? (
          <span className="mt-2.5 flex flex-wrap gap-2">
            {meta.map((item) => (
              <span key={item.label} className="fs-11 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600">
                {item.label}: {item.value}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </span>
  </button>
);

const Money = ({
  value,
  className = "",
  align = "center",
}: {
  value: number | string | null | undefined;
  className?: string;
  align?: "center" | "right";
}) => {
  const short = formatCompactCurrency(value);
  const full = formatCurrency(value);
  if (short === full) {
    return <span className={`block truncate ${className}`}>{short}</span>;
  }
  return (
    <span className={`group/money relative inline-block max-w-full align-bottom ${className}`}>
      <span className="block truncate">{short}</span>
      <span
        className={`pointer-events-none absolute bottom-[calc(100%+6px)] z-50 whitespace-nowrap rounded-lg border border-[var(--panel-border)] bg-[var(--panel-strong)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-panel)] transition group-hover/money:opacity-100 ${
          align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {full}
      </span>
    </span>
  );
};

export const DashboardPage = () => {
  const { preferences } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentInvoicesPage, setRecentInvoicesPage] = useState<PageResponse<Invoice>>(emptyPage<Invoice>());
  const [chartPoints, setChartPoints] = useState<SalesCollectionsPoint[]>([]);
  const [chartUnit, setChartUnit] = useState<"day" | "month">("day");
  const [chartLoading, setChartLoading] = useState(false);
  const [ownerAnalytics, setOwnerAnalytics] = useState<OwnerAnalytics | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [topProductsPage, setTopProductsPage] = useState<PageResponse<TopSellingProduct>>(emptyPage<TopSellingProduct>());
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategory[]>([]);
  const [salesByCategoryPage, setSalesByCategoryPage] = useState<PageResponse<SalesByCategory>>(emptyPage<SalesByCategory>());
  const [outstandingCustomersPage, setOutstandingCustomersPage] = useState<PageResponse<CustomerDue>>(emptyPage<CustomerDue>());
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState(() => buildRange("thisMonth"));
  const [activeCard, setActiveCard] = useState<DashboardCardKey | null>(null);
  const [details, setDetails] = useState<DashboardDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(0);
  const [detailSearch, setDetailSearch] = useState("");
  const [debouncedDetailSearch, setDebouncedDetailSearch] = useState("");
  const [detailSort, setDetailSort] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "date",
    sortDirection: "desc"
  });
  const [activeList, setActiveList] = useState<DashboardListKey | null>(null);
  const [listPage, setListPage] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [debouncedListSearch, setDebouncedListSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listData, setListData] = useState<PageResponse<Invoice | DashboardDetailRow | TopSellingProduct | SalesByCategory | CustomerDue>>(emptyPage<Invoice | DashboardDetailRow | TopSellingProduct | SalesByCategory | CustomerDue>());

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);
  // Chart dashboard filter ke saath chalta hai. Ek din ki range = ek bar (bekaar), isliye us din tak ke 7 din.
  const singleDayRange = Boolean(activeRange.startDate && activeRange.startDate === activeRange.endDate);
  const chartRange = useMemo(
    () => (singleDayRange && activeRange.endDate ? { startDate: shiftIsoDate(activeRange.endDate, -6), endDate: activeRange.endDate } : activeRange),
    [activeRange, singleDayRange]
  );
  const selectedConfig = activeCard ? detailConfig[activeCard] : null;
  const customerDetailOpen = activeCard === "customers" || activeCard === "newCustomers" || activeCard === "existingCustomers";
  const categoryTotal = useMemo(() => salesByCategory.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0), [salesByCategory]);
  // Scope saaf rakho: billed / collected = chuna hua period; outstanding = end date tak ka
  // poora baaki (saare unpaid invoices). Pehle dono ko jod kar "Total Outstanding" aur
  // ek mixed "collection rate" dikhta tha jo Today jaisi range par bekaar number deta tha.
  const billedAmount = Number(summary?.totalSales ?? 0);
  const collectedAmount = Number(summary?.totalCollection ?? 0);
  const collectionRate = billedAmount > 0 ? (collectedAmount / billedAmount) * 100 : null;
  const darkMode = Boolean(preferences.darkModeEnabled);
  const seriesColors = darkMode ? SALES_COLLECTION_COLORS.dark : SALES_COLLECTION_COLORS.light;
  const chartTooltipTheme = getChartTheme(preferences.darkModeEnabled);
  const grandTotalRow = useMemo(
    () => (selectedConfig && details ? buildGrandTotalRow(details.rows, selectedConfig.columns) : null),
    [details, selectedConfig]
  );
  const dashboardCards = useMemo(
    () =>
      [
        {
          key: "totalSales" as const,
          label: "Total Sales",
          value: formatCompactCurrency(summary?.totalSales),
          fullValue: formatCurrency(summary?.totalSales),
          caption: "In selected period",
          icon: <TrendingUp size={18} />,
          growth: formatTrend(summary?.totalSalesTrendPercentage, summary?.totalSales),
          growthTone: trendTone(summary?.totalSalesTrendPercentage, true),
          analyticsColor: seriesColors.sales,
          trend: cumulative(ownerAnalytics?.salesTrend)
        },
        {
          key: "collections" as const,
          label: "Collections",
          value: formatCompactCurrency(summary?.totalCollection),
          fullValue: formatCurrency(summary?.totalCollection),
          caption: "Recorded payments",
          icon: <CreditCard size={18} />,
          growth: formatTrend(summary?.collectionTrendPercentage, summary?.totalCollection),
          growthTone: trendTone(summary?.collectionTrendPercentage, true),
          analyticsColor: seriesColors.collections,
          trend: cumulative(ownerAnalytics?.collectionTrend)
        },
        {
          key: "outstanding" as const,
          label: "Outstanding",
          value: formatCompactCurrency(summary?.outstandingAmount),
          fullValue: formatCurrency(summary?.outstandingAmount),
          caption: "Pending balance",
          icon: <Wallet size={18} />,
          growth: formatTrend(summary?.outstandingTrendPercentage, summary?.outstandingAmount),
          // Outstanding badhna buri khabar: up = laal.
          growthTone: trendTone(summary?.outstandingTrendPercentage, false),
          analyticsColor: CHART_COLORS.outstanding,
          trend: ownerAnalytics?.outstandingTrend?.map((point) => point.value)
        },
      ],
    [summary, ownerAnalytics, seriesColors]
  );
  const compactMetrics = useMemo(
    () => [
      {
        key: "products" as const,
        label: "Products",
        value: String(summary?.totalProducts ?? 0),
        caption: "Sold in selected range",
        icon: <Boxes size={17} />
      },
      {
        key: "invoices" as const,
        label: "Invoices",
        value: String(summary?.totalInvoices ?? 0),
        caption: "Issued in range",
        icon: <FileText size={17} />
      }
    ],
    [summary]
  );

  // Perf: har widget apna data aate hi dikhata hai. Pehle Promise.all sabse slow call
  // (owner-overview) tak poora dashboard roke rakhta tha. `cancelled` = purane preset ka
  // late response naye data ko overwrite na kare.
  useEffect(() => {
    let cancelled = false;
    void getDashboardSummary(activeRange).then((summaryData) => {
      if (!cancelled) setSummary(summaryData);
    });
    void getInvoicesPage({ ...activeRange, page: 0, size: DASHBOARD_ROW_LIMIT }).then((invoicesData) => {
      if (!cancelled) setRecentInvoicesPage(invoicesData);
    });
    void getTopProducts({ ...activeRange, page: 0, size: DASHBOARD_ROW_LIMIT })
      .catch(() => emptyPage<TopSellingProduct>())
      .then((productData) => {
        if (cancelled) return;
        setTopProducts(productData.records);
        setTopProductsPage(productData);
      });
    void getSalesByCategoryDetails({ ...activeRange, page: 0, size: DASHBOARD_ROW_LIMIT })
      .catch(() => emptyPage<SalesByCategory>())
      .then((categoryPageData) => {
        if (cancelled) return;
        setSalesByCategory(categoryPageData.records);
        setSalesByCategoryPage(categoryPageData);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRange]);

  // Outstanding customers date range par depend nahi karte: sirf ek baar (pehle har preset change par dobara).
  useEffect(() => {
    let cancelled = false;
    void getCustomerDueList({ page: 0, size: DASHBOARD_ROW_LIMIT })
      .catch(() => emptyPage<CustomerDue>())
      .then((outstandingData) => {
        if (!cancelled) setOutstandingCustomersPage(outstandingData);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    // Cards ki sparkline (activeRange) aur chart (chartRange) dono owner-overview se aate hain.
    // Single-day range ke alawa dono same hain — pehle same heavy API do baar chalti thi.
    const ownerRequest = getOwnerAnalytics(activeRange);
    const chartRequest = chartRange === activeRange ? ownerRequest : getOwnerAnalytics(chartRange);
    void ownerRequest
      .then((data) => {
        if (!cancelled) setOwnerAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setOwnerAnalytics(null);
      });
    void chartRequest
      .then((data) => {
        if (cancelled) return;
        // Dono series same buckets me same order me aati hain: index se jodo (label se nahi —
        // "Jan" jaisa label saal paar karti range me do baar aa kar mix ho jata tha).
        const periods = buildChartPeriods(data.startDate ?? chartRange.startDate, data.endDate ?? chartRange.endDate, data.salesTrend.length);
        setChartUnit(periods?.[0]?.daily === false ? "month" : "day");
        setChartPoints(data.salesTrend.map((point, position) => ({
          axisLabel: periods?.[position]?.axisLabel ?? point.label,
          fullLabel: periods?.[position]?.fullLabel ?? point.label,
          sales: Number(point.value ?? 0),
          collections: Number(data.collectionTrend[position]?.value ?? 0)
        })));
      })
      .catch(() => {
        if (!cancelled) setChartPoints([]);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRange, chartRange]);

  // Search har keystroke par API na maare (pehle har akshar = ek heavy details call).
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDetailSearch(detailSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [detailSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedListSearch(listSearch), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [listSearch]);

  useEffect(() => {
    if (!activeCard) {
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    void getDashboardDetails({
      card: activeCard,
      ...activeRange,
      page: detailPage,
      size: DEFAULT_PAGE_SIZE,
      sortBy: detailSort.sortBy,
      sortDirection: detailSort.sortDirection,
      search: debouncedDetailSearch || undefined
    })
      .then((detailData) => {
        if (!cancelled) setDetails(detailData);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCard, activeRange, detailPage, debouncedDetailSearch, detailSort]);

  useEffect(() => {
    if (!activeList) {
      return;
    }
    let cancelled = false;
    setListLoading(true);
    const search = debouncedListSearch.trim() || undefined;
    const request =
      activeList === "recentInvoices"
        ? getInvoicesPage({ ...activeRange, search, page: listPage, size: DASHBOARD_MODAL_PAGE_SIZE })
        : activeList === "topCustomers"
          ? getDashboardDetails({ card: "customers", ...activeRange, page: listPage, size: DASHBOARD_MODAL_PAGE_SIZE, sortBy: "totalPurchaseAmount", sortDirection: "desc", search })
          : activeList === "topProducts"
            ? getTopProducts({ ...activeRange, search, page: listPage, size: DASHBOARD_MODAL_PAGE_SIZE })
            : activeList === "salesByCategory"
              ? getSalesByCategoryDetails({ ...activeRange, search, page: listPage, size: DASHBOARD_MODAL_PAGE_SIZE })
              : getCustomerDueList({ search, page: listPage, size: DASHBOARD_MODAL_PAGE_SIZE });

    void request
      .then((response) => {
        if (cancelled) return;
        if ("totalElements" in response) {
          setListData({
            records: response.rows,
            page: response.page,
            size: response.size,
            totalRecords: response.totalElements,
            totalPages: response.totalPages
          });
          return;
        }
        setListData(response);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeList, activeRange, listPage, debouncedListSearch]);

  // Naya card/list kholte waqt search turant khali (debounce ka purana search request me na jaye).
  const openDetails = (card: DashboardCardKey) => {
    setActiveCard(card);
    setDetails(null);
    setDetailPage(0);
    setDetailSearch("");
    setDebouncedDetailSearch("");
    setDetailSort({ sortBy: detailConfig[card].defaultSort, sortDirection: "desc" });
  };

  const switchCustomerDetailTab = (card: Extract<DashboardCardKey, "customers" | "newCustomers" | "existingCustomers">) => {
    setActiveCard(card);
    setDetails(null);
    setDetailPage(0);
    setDetailSearch("");
    setDebouncedDetailSearch("");
    setDetailSort({ sortBy: detailConfig[card].defaultSort, sortDirection: "desc" });
  };

  const openListDetails = (list: DashboardListKey) => {
    setActiveList(list);
    setListData(emptyPage<Invoice | DashboardDetailRow | TopSellingProduct | SalesByCategory | CustomerDue>());
    setListPage(0);
    setListSearch("");
    setDebouncedListSearch("");
  };

  const toggleSort = (column: DetailColumn) => {
    if (!column.sortable) {
      return;
    }
    setDetailPage(0);
    setDetailSort((current) => ({
      sortBy: column.key,
      sortDirection: current.sortBy === column.key && current.sortDirection === "desc" ? "asc" : "desc"
    }));
  };

  const exportDetails = () => {
    if (!selectedConfig || !details) {
      return;
    }
    const exportRows = grandTotalRow ? [...details.rows, grandTotalRow] : details.rows;
    exportToExcel(`${details.card}-dashboard-details.xlsx`, exportRows, selectedConfig.columns.map((column) => ({
      key: column.key,
      header: column.header,
      type: column.type === "currency" ? "amount" : column.type === "date" ? "date" : "text",
      value: (row) => toExcelCellValue(row[column.key])
    })));
  };

  const activeListConfig = activeList ? dashboardListConfig[activeList] : null;
  const activeListGrandTotal = activeListConfig?.totalKey
    ? formatCurrency(listData.records.reduce((sum, row) => sum + Number((row as Record<string, unknown>)[activeListConfig.totalKey ?? ""] ?? 0), 0))
    : undefined;

  const exportListDetails = () => {
    if (!activeListConfig) {
      return;
    }
    const exportRows = activeListConfig.totalKey
      ? [...listData.records, buildListTotalRow(listData.records, activeListConfig)]
      : listData.records;
    exportToExcel(`${activeList ?? "dashboard"}-details.xlsx`, exportRows, activeListConfig.columns.map((column) => ({
      key: column.key,
      header: column.header,
      type: column.type === "currency" ? "amount" : column.type === "date" ? "date" : "text",
      value: (row) => toExcelCellValue(column.value ? column.value(row as DashboardListRow) : (row as Record<string, unknown>)[column.key])
    })));
  };

  const modalFilters = [
    activeRange.startDate && activeRange.endDate ? `Date Range = ${formatDate(activeRange.startDate)} to ${formatDate(activeRange.endDate)}` : null,
    detailSearch ? `Search = ${detailSearch}` : null
  ].filter(Boolean);
  const listModalFilters = [
    activeRange.startDate && activeRange.endDate && activeList !== "outstandingCustomers" ? `Date Range = ${formatDate(activeRange.startDate)} to ${formatDate(activeRange.endDate)}` : null,
    listSearch ? `Search = ${listSearch}` : null
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4 pb-6 md:space-y-5">
      <Header
        title="Dashboard"
        subtitle="Track sales, collections, open balances, and customer performance with date-based business visibility."
      />

      <MfaEnrollBanner />

      <Panel className="p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Filters</p>
              <h2 className="fs-18 mt-1.5 font-semibold text-slate-950">Dashboard Filters</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESET_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                variant={preset === value ? "primary" : "secondary"}
                onClick={() => setPreset(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        {preset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:max-w-xl">
            <Input
              label="Start date"
              type="date"
              value={customRange.startDate}
              onChange={(event) => setCustomRange((current) => ({ ...current, startDate: event.target.value }))}
            />
            <Input
              label="End date"
              type="date"
              value={customRange.endDate}
              onChange={(event) => setCustomRange((current) => ({ ...current, endDate: event.target.value }))}
            />
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {dashboardCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            variant="flat"
            value={card.value}
            valueTitle={card.fullValue}
            caption={card.caption}
            icon={card.icon}
            growth={card.growth}
            growthTone={card.growthTone}
            growthTitle="vs previous period of the same length"
            analyticsColor={card.analyticsColor}
            trend={card.trend}
            onClick={card.key ? () => openDetails(card.key) : undefined}
          />
        ))}
        <StatCard
          label="Total Expense"
          variant="flat"
          value={formatCompactCurrency(summary?.totalExpense)}
          valueTitle={formatCurrency(summary?.totalExpense)}
          caption="Recorded business spend"
          icon={<Banknote size={18} />}
          analyticsColor={CHART_COLORS.products}
          trend={cumulative(ownerAnalytics?.expenseTrend)}
          onClick={() => openDetails("totalExpense")}
        />
        <StatCard
          label="Net Revenue"
          variant="flat"
          value={formatCompactCurrency(summary?.netRevenue)}
          valueTitle={formatCurrency(summary?.netRevenue)}
          caption="Collection minus expense"
          icon={<TrendingUp size={18} />}
          analyticsColor={CHART_COLORS.customers}
          trend={cumulative(ownerAnalytics?.netProfitTrend)}
          onClick={() => openDetails("netRevenue")}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DashboardCompactCard
          label="Customers"
          value={summary?.totalCustomers ?? 0}
          caption="Active buying base"
          icon={<Users size={18} />}
          accentColor="#8b5cf6"
          meta={[
            { label: "New", value: summary?.newCustomers ?? 0 },
            { label: "Existing", value: summary?.existingCustomers ?? 0 }
          ]}
          onClick={() => openDetails("customers")}
        />
        {compactMetrics.map((metric) => (
          <DashboardCompactCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            caption={metric.caption}
            icon={metric.icon}
            accentColor={metric.key === "products" ? "#f97316" : "#2563eb"}
            onClick={() => {
              if (metric.key === "products" || metric.key === "invoices") {
                openDetails(metric.key);
              }
            }}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <Panel className="p-4 md:p-5">
          <div className="mb-4">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Analytics</p>
            <h2 className="mt-2 fs-18 font-bold text-slate-950">Sales vs Collections</h2>
          </div>
          <SalesCollectionsChart
            data={chartPoints}
            dark={darkMode}
            periodUnit={chartUnit}
            loading={chartLoading}
            rangeNote={singleDayRange && chartRange.startDate ? `Showing last 7 days (${formatDate(chartRange.startDate)} – ${formatDate(chartRange.endDate)}) for context` : undefined}
          />
        </Panel>

        <Panel className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Products</p>
              <h2 className="mt-2 fs-18 font-bold text-slate-950">Top Selling Products</h2>
            </div>
            <p className="fs-11 shrink-0 rounded-full bg-slate-100 px-3 py-0.5 font-semibold text-slate-500">Top 7</p>
          </div>
          <div className="mt-5">
            <RankedBarList
              color={seriesColors.sales}
              emptyText="No product sales in the selected range."
              items={topProducts.map((product) => ({
                id: product.productId,
                label: product.productName,
                value: Number(product.totalSalesAmount ?? 0),
                meta: product.totalQtySold ? `${product.totalQtySold} sold` : undefined
              }))}
            />
          </div>
          {topProductsPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("topProducts")}>Show More Records</Button>
            </div>
          ) : null}
        </Panel>
      </div>

      {/* Dono panels flex-col: grid stretch par Show More neeche align ho, beech me khaali dabba na dikhe. */}
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel className="flex flex-col p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Recent invoices</p>
              <h2 className="mt-2 fs-18 font-bold text-slate-950">Billing activity</h2>
            </div>
            <p className="fs-12 text-slate-400">{recentInvoicesPage.totalRecords} invoice{recentInvoicesPage.totalRecords === 1 ? "" : "s"}</p>
          </div>
          <div className="flex-1">
          <Table
            data={recentInvoicesPage.records}
            minHeightClass="min-h-0"
            emptyText="No invoices fall within the selected range."
            columns={[
              { key: "invoice", header: "Invoice", render: (item) => <span className="break-words font-semibold text-slate-950">{item.invoiceNo}</span> },
              {
                key: "customer",
                header: "Customer",
                render: (item) => (
                  <div className="whitespace-nowrap">
                    <p className="font-semibold text-slate-950">{item.customerName}</p>
                    <p className="text-xs text-slate-400">{item.customerMobile}</p>
                  </div>
                )
              },
              { key: "date", header: "Date", render: (item) => <span className="whitespace-nowrap">{formatDate(item.invoiceDate)}</span> },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.paymentStatus} /> },
              {
                key: "balance",
                header: "Balance",
                className: "text-right",
                render: (item) => <span className="block whitespace-nowrap text-right font-semibold text-slate-950">{formatCurrency(item.balanceAmount)}</span>
              }
            ]}
          />
          </div>
          {recentInvoicesPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("recentInvoices")}>Show More Records</Button>
            </div>
          ) : null}
        </Panel>

        <Panel className="flex flex-col p-4 md:p-5">
          <div className="mb-5">
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Top customers</p>
            <h2 className="mt-2 fs-18 font-bold text-slate-950">Highest sales contribution</h2>
          </div>
          <div className="flex-1 space-y-2">
            {summary?.topCustomers?.length ? (
              summary.topCustomers.slice(0, DASHBOARD_ROW_LIMIT).map((customer) => (
                // Compact row (Billing activity table ki row jitni): pehle 3-line card + alag Paid/Due
                // line thi, isliye ye column lamba hota aur left table ke neeche ~300px khaali bachta tha.
                <div key={customer.customerId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate fs-13 font-semibold text-slate-950">{customer.customerName}</p>
                    <Money value={customer.totalPurchaseAmount} align="right" className="shrink-0 fs-13 font-bold text-slate-950" />
                  </div>
                  {(() => {
                    const paid = Math.max(0, Number(customer.totalPaidAmount ?? 0));
                    const due = Math.max(0, Number(customer.outstandingBalance ?? 0));
                    const base = paid + due;
                    const paidShare = base > 0 ? (paid / base) * 100 : 0;
                    return (
                      <div className="mt-1.5 flex items-center gap-3">
                        <p className="min-w-0 flex-1 truncate fs-11 text-slate-500" title={`Paid ${formatCurrency(paid)} · Due ${formatCurrency(due)}`}>
                          {customer.mobile} · {formatDate(customer.lastPurchaseDate)}
                        </p>
                        <div className="flex h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                          <div className="h-full" style={{ width: `${paidShare}%`, background: seriesColors.collections }} />
                          {paidShare > 0 && paidShare < 100 ? <div className="h-full w-0.5 bg-white" /> : null}
                          <div className="h-full flex-1" style={{ background: base > 0 && due > 0 ? CHART_COLORS.outstanding : "transparent" }} />
                        </div>
                        <span className={`shrink-0 whitespace-nowrap text-right fs-11 font-semibold ${due > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {due > 0 ? `Due ${formatCurrency(due)}` : "Fully paid"}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No customer activity found for the selected range.
              </div>
            )}
          </div>
          {(summary?.totalCustomers ?? 0) > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("topCustomers")}>Show More Records</Button>
            </div>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="flex flex-col p-4 md:p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Categories</p>
              <h2 className="mt-2 fs-18 font-bold text-slate-950">Sales By Category</h2>
            </div>
            <p className="fs-11 shrink-0 rounded-full bg-slate-100 px-3 py-0.5 font-semibold text-slate-500">Top 7</p>
          </div>
          {salesByCategory.length ? (
            <div className="relative h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {/* Slices ke beech 2px surface stroke (paddingAngle akeli category par ajeeb gap deta tha). */}
                  <Pie
                    data={salesByCategory}
                    dataKey="totalAmount"
                    nameKey="categoryName"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={0}
                    stroke={darkMode ? "#0f172a" : "#ffffff"}
                    strokeWidth={salesByCategory.length > 1 ? 2 : 0}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {salesByCategory.map((category, index) => (
                      <Cell
                        key={category.categoryId}
                        fill={categoryColorFor(category.categoryName, index)}
                        opacity={!activeCategoryId || activeCategoryId === category.categoryId ? 1 : 0.28}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipTheme.tooltipContentStyle} itemStyle={chartTooltipTheme.tooltipItemStyle} labelStyle={chartTooltipTheme.tooltipLabelStyle} cursor={chartTooltipTheme.tooltipCursor} formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="fs-11 font-semibold uppercase tracking-[0.14em] text-slate-400">Total sales</span>
                <span className="mt-1 fs-18 font-bold text-slate-950">{formatShortCurrency(categoryTotal)}</span>
                <span className="fs-11 text-slate-400">{salesByCategory.length} {salesByCategory.length === 1 ? "category" : "categories"}</span>
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex-1 space-y-2">
            {salesByCategory.length ? salesByCategory.map((category, index) => (
              <button
                key={category.categoryId}
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${activeCategoryId === category.categoryId ? "border-slate-300 bg-slate-100" : "border-transparent bg-slate-50 hover:bg-slate-100"}`}
                onClick={() => setActiveCategoryId((current) => (current === category.categoryId ? null : category.categoryId))}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: categoryColorFor(category.categoryName, index) }} />
                  <span className="truncate fs-13 font-semibold text-slate-700">{category.categoryName}</span>
                </span>
                {/* Amount + % ek line me (pehle 2 line): list chhoti, Outstanding card ke neeche khaali jagah nahi. */}
                <span className="flex shrink-0 items-baseline gap-2 text-right">
                  <Money value={category.totalAmount} align="right" className="text-sm font-extrabold text-slate-950" />
                  <span className="w-9 text-xs font-bold text-slate-400">{categoryTotal ? category.percentage.toFixed(0) : "0"}%</span>
                </span>
              </button>
            )) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No category sales found for the selected range.</div>
            )}
          </div>
          {salesByCategoryPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("salesByCategory")}>Show More Records</Button>
            </div>
          ) : null}
        </Panel>
        <div className="flex flex-col">
          <Panel className="flex flex-1 flex-col p-4 md:p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Banknote size={20} />
            </div>
            <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Outstanding</p>
              <h2 className="mt-1 fs-18 font-bold text-slate-950">Outstanding Overview</h2>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            {collectionRate !== null ? (
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold text-slate-700">Collected vs billed (this period)</span>
                  <span className="fs-18 font-bold text-slate-950">{collectionRate.toFixed(0)}%</span>
                </div>
                {/* Meter: track same ramp ka halka step, fill = collected share (100% par cap). */}
                <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${OUTSTANDING_WIDGET_COLORS.collected} 18%, transparent)` }}>
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, collectionRate)}%`, backgroundColor: OUTSTANDING_WIDGET_COLORS.collected }} />
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {collectionRate >= 100
                    ? "Collections cover everything billed in this period (includes payments for older invoices)."
                    : `${formatCurrency(Math.max(0, billedAmount - collectedAmount))} of this period's billing is not collected yet.`}
                </p>

              </div>
            ) : (
              <div className="flex min-h-[72px] items-center justify-center text-center text-sm font-semibold text-slate-500">
                No billing in the selected period
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="fs-14 font-bold text-slate-950">Top Outstanding Customers</p>
              <p className="fs-11 shrink-0 rounded-full bg-slate-100 px-3 py-0.5 font-semibold text-slate-500">Top 7</p>
            </div>
            <div className="flex-1 space-y-2">
              {outstandingCustomersPage.records.length ? outstandingCustomersPage.records.map((customer) => (
                <div key={customer.customerId} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate fs-13 font-semibold text-slate-700">{customer.customerName}</p>
                    <p className="truncate text-xs text-slate-400">{customer.mobile}</p>
                  </div>
                  <Money value={customer.currentBalance} align="right" className="shrink-0 text-sm font-bold text-slate-950" />
                </div>
              )) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No outstanding customers found.</div>
              )}
            </div>
            {outstandingCustomersPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("outstandingCustomers")}>Show More Records</Button>
              </div>
            ) : null}
          </div>
          </Panel>

        </div>
      </div>

      <CommonDashboardDetailModal
        open={Boolean(activeList && activeListConfig)}
        title={activeListConfig?.title ?? "Dashboard Details"}
        rows={listData.records}
        columns={activeListConfig?.columns ?? []}
        loading={listLoading}
        search={listSearch}
        page={listData.page}
        totalRecords={listData.totalRecords}
        totalPages={listData.totalPages}
        activeFilters={listModalFilters}
        grandTotal={activeListGrandTotal}
        emptyText={activeListConfig?.emptyText}
        paginationPosition="top"
        onClose={() => setActiveList(null)}
        onSearchChange={(value) => {
          setListPage(0);
          setListSearch(value);
        }}
        onPageChange={setListPage}
        onExport={exportListDetails}
      />

      <Modal open={Boolean(activeCard)} title={customerDetailOpen ? "Customer Details" : selectedConfig?.title ?? "Dashboard Details"} onClose={() => setActiveCard(null)}>
        <div className="space-y-5">
          {customerDetailOpen ? (
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
              {([
                { key: "customers", label: "All Customers", count: summary?.totalCustomers ?? 0 },
                { key: "newCustomers", label: "New Customers", count: summary?.newCustomers ?? 0 },
                { key: "existingCustomers", label: "Existing Customers", count: summary?.existingCustomers ?? 0 }
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`rounded-xl px-4 py-3 text-left transition ${activeCard === tab.key ? "bg-white shadow-sm ring-1 ring-slate-200" : "hover:bg-white/70"}`}
                  onClick={() => switchCustomerDetailTab(tab.key)}
                >
                  <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{tab.label}</span>
                  <span className="mt-1 block fs-18 font-bold text-slate-950">{tab.count}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-950">Active Filters:</span>
            <span className="min-w-0 flex-1 text-slate-600">{modalFilters.join(" | ") || "No filters applied"}</span>
            <span className="font-semibold text-slate-950">Records: {details?.totalElements ?? 0}</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input
                className="w-full rounded-[var(--radius-control)] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]"
                placeholder={`Search ${selectedConfig?.title ?? "dashboard details"}`}
                value={detailSearch}
                onChange={(event) => {
                  setDetailPage(0);
                  setDetailSearch(event.target.value);
                }}
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="button" variant="secondary" onClick={exportDetails} disabled={!details?.rows.length}>
                <Download size={17} />
                Export Excel
              </Button>
              {details ? (
                <div className="flex justify-end"><Pagination
                  page={details.page}
                  size={details.size}
                  totalRecords={details.totalElements}
                  totalPages={details.totalPages}
                  disabled={detailsLoading}
                  onPageChange={setDetailPage}
                layout="inline" /></div>
              ) : null}
            </div>
          </div>

          <div className="scrollbar-thin overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  {selectedConfig?.columns.map((column) => (
                    <th key={column.key} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 first:pl-5 last:pr-5">
                      <button type="button" className="inline-flex items-center gap-1 text-left transition hover:text-slate-950" onClick={() => toggleSort(column)}>
                        <span>{column.header}</span>
                        {detailSort.sortBy === column.key ? (
                          detailSort.sortDirection === "desc" ? <ChevronDown className="text-slate-400" size={14} /> : <ChevronUp className="text-slate-400" size={14} />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailsLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500 first:pl-5 last:pr-5" colSpan={selectedConfig?.columns.length ?? 1}>Loading details...</td>
                  </tr>
                ) : details?.rows.length ? (
                  <>
                    {details.rows.map((row, index) => (
                      <tr key={index} className="group odd:bg-white even:bg-slate-50/55 transition hover:bg-[color-mix(in_srgb,var(--theme-color)_6%,white)]">
                        {selectedConfig?.columns.map((column) => (
                          <td key={column.key} className="border-b border-slate-100 px-4 py-4 align-top text-slate-700 first:pl-5 last:pr-5 group-last:border-b-0">
                            {column.type === "status" ? <StatusBadge label={formatCell(row, column)} /> : formatCell(row, column)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {grandTotalRow ? (
                      <tr className="grand-total-row">
                        {selectedConfig?.columns.map((column) => (
                          <td key={column.key} className="border-t border-slate-200 px-4 py-4 align-top first:pl-5 last:pr-5">
                            {formatCell(grandTotalRow, column)}
                          </td>
                        ))}
                      </tr>
                    ) : null}
                  </>
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500 first:pl-5 last:pr-5" colSpan={selectedConfig?.columns.length ?? 1}>No details found for this card.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};

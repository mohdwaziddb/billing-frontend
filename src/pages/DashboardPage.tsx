import { useEffect, useMemo, useState } from "react";
import { Banknote, Boxes, ChevronDown, ChevronUp, CreditCard, Download, FileText, Search, TrendingUp, Users, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { getCustomerDueList, getOwnerAnalytics, getSalesByCategoryDetails, getTopProducts } from "../api/analytics";
import { getDashboardDetails, getDashboardSummary } from "../api/dashboard";
import { getInvoicesPage } from "../api/invoices";
import { Button } from "../components/Button";
import { CommonDashboardDetailModal, type DashboardDetailModalColumn } from "../components/CommonDashboardDetailModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { formatAmount, formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import type { CustomerDue, DashboardCardKey, DashboardDetail, DashboardDetailRow, DashboardSummary, Invoice, MetricPoint, PageResponse, SalesByCategory, TopSellingProduct } from "../types/api";

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

const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" }
];

const GRAPH_PRESET_OPTIONS = DATE_PRESET_OPTIONS.filter((option) => option.value !== "custom");

const CHART_COLORS = {
  sales: "#2563eb",
  collection: "#16a34a",
  outstanding: "#ef4444",
  customers: "#8b5cf6",
  products: "#f97316",
  palette: ["#2563eb", "#16a34a", "#f97316", "#8b5cf6", "#0d9488", "#f43f5e", "#64748b"]
};

const OUTSTANDING_WIDGET_COLORS = {
  collected: "#16a34a",
  outstanding: "#dc2626",
  remaining: "#f97316"
};

const categoryColorFor = (categoryName: string, index: number) => {
  const name = categoryName.toLowerCase();
  if (name.includes("electronic")) return "#2563eb";
  if (name.includes("cloth") || name.includes("apparel") || name.includes("fashion")) return "#16a34a";
  if (name.includes("print")) return "#f97316";
  if (name.includes("service")) return "#8b5cf6";
  if (name.includes("other") || name.includes("misc")) return "#0d9488";
  return CHART_COLORS.palette[index % CHART_COLORS.palette.length];
};

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

const formatTrend = (value?: number | null) => {
  const safeValue = Number(value ?? 0);
  if (safeValue === 0) {
    return "0%";
  }
  return `${safeValue > 0 ? "+" : ""}${safeValue.toFixed(2)}%`;
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

export const DashboardPage = () => {
  const { preferences } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentInvoicesPage, setRecentInvoicesPage] = useState<PageResponse<Invoice>>(emptyPage<Invoice>());
  const [salesTrendData, setSalesTrendData] = useState<MetricPoint[]>([]);
  const [ownerAnalytics, setOwnerAnalytics] = useState<{
    salesTrend: MetricPoint[];
    collectionTrend: MetricPoint[];
    outstandingTrend: MetricPoint[];
    monthlyRevenue: MetricPoint[];
  } | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [topProductsPage, setTopProductsPage] = useState<PageResponse<TopSellingProduct>>(emptyPage<TopSellingProduct>());
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategory[]>([]);
  const [salesByCategoryPage, setSalesByCategoryPage] = useState<PageResponse<SalesByCategory>>(emptyPage<SalesByCategory>());
  const [outstandingCustomersPage, setOutstandingCustomersPage] = useState<PageResponse<CustomerDue>>(emptyPage<CustomerDue>());
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState(() => buildRange("thisMonth"));
  const [salesTrendPreset, setSalesTrendPreset] = useState<DatePreset>("thisMonth");
  const [activeCard, setActiveCard] = useState<DashboardCardKey | null>(null);
  const [details, setDetails] = useState<DashboardDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(0);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailSort, setDetailSort] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "date",
    sortDirection: "desc"
  });
  const [activeList, setActiveList] = useState<DashboardListKey | null>(null);
  const [listPage, setListPage] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listData, setListData] = useState<PageResponse<Invoice | DashboardDetailRow | TopSellingProduct | SalesByCategory | CustomerDue>>(emptyPage<Invoice | DashboardDetailRow | TopSellingProduct | SalesByCategory | CustomerDue>());

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);
  const salesTrendRange = useMemo(() => buildRange(salesTrendPreset), [salesTrendPreset]);
  const selectedConfig = activeCard ? detailConfig[activeCard] : null;
  const categoryTotal = useMemo(() => salesByCategory.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0), [salesByCategory]);
  const collectedAmount = Number(summary?.totalCollection ?? 0);
  const remainingAmount = Number(summary?.outstandingAmount ?? 0);
  const totalOutstandingBase = collectedAmount + remainingAmount;
  const collectionRate = totalOutstandingBase > 0 ? (collectedAmount / totalOutstandingBase) * 100 : 0;
  const outstandingRate = totalOutstandingBase > 0 ? (remainingAmount / totalOutstandingBase) * 100 : 0;
  const hasOutstandingOverviewData = totalOutstandingBase > 0;
  const outstandingOverviewData = useMemo(() => [
    { name: "Collected", value: collectedAmount, color: OUTSTANDING_WIDGET_COLORS.collected },
    { name: "Outstanding", value: remainingAmount, color: OUTSTANDING_WIDGET_COLORS.outstanding }
  ].filter((item) => item.value > 0), [collectedAmount, remainingAmount]);
  const chartTextColor = preferences.darkModeEnabled ? "#CBD5E1" : "#64748B";
  const chartGridColor = preferences.darkModeEnabled ? "#334155" : "#e8edf5";
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
          value: formatCurrency(summary?.totalSales),
          caption: "In selected period",
          icon: <TrendingUp size={18} />,
          growth: formatTrend(summary?.totalSalesTrendPercentage),
          analyticsColor: CHART_COLORS.sales
        },
        {
          key: "collections" as const,
          label: "Collections",
          value: formatCurrency(summary?.totalCollection),
          caption: "Recorded payments",
          icon: <CreditCard size={18} />,
          growth: formatTrend(summary?.collectionTrendPercentage),
          analyticsColor: CHART_COLORS.collection
        },
        {
          key: "outstanding" as const,
          label: "Outstanding",
          value: formatCurrency(summary?.outstandingAmount),
          caption: "Pending balance",
          icon: <Wallet size={18} />,
          growth: formatTrend(summary?.outstandingTrendPercentage),
          analyticsColor: CHART_COLORS.outstanding
        },
        {
          key: "customers" as const,
          label: "Total Customers",
          value: String(summary?.totalCustomers ?? 0),
          caption: "Purchased in range",
          icon: <Users size={18} />,
          growth: formatTrend(summary?.totalCustomersTrendPercentage),
          analyticsColor: CHART_COLORS.customers
        }
      ],
    [summary]
  );
  const compactMetrics = useMemo(
    () => [
      {
        key: "newCustomers" as const,
        label: "New Customers",
        value: String(summary?.newCustomers ?? 0),
        caption: "First purchase in range",
        icon: <Users size={17} />
      },
      {
        key: "existingCustomers" as const,
        label: "Existing Customers",
        value: String(summary?.existingCustomers ?? 0),
        caption: "Repeat buyers",
        icon: <Users size={17} />
      },
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

  useEffect(() => {
    void Promise.all([
      getDashboardSummary(activeRange),
      getInvoicesPage({ ...activeRange, page: 0, size: DASHBOARD_ROW_LIMIT }),
      getOwnerAnalytics(activeRange).catch(() => null),
      getTopProducts({ ...activeRange, page: 0, size: DASHBOARD_ROW_LIMIT }).catch(() => emptyPage<TopSellingProduct>()),
      getSalesByCategoryDetails({ ...activeRange, page: 0, size: DASHBOARD_ROW_LIMIT }).catch(() => emptyPage<SalesByCategory>()),
      getCustomerDueList({ page: 0, size: DASHBOARD_ROW_LIMIT }).catch(() => emptyPage<CustomerDue>())
    ]).then(([summaryData, invoicesData, ownerData, productData, categoryPageData, outstandingData]) => {
      setSummary(summaryData);
      setOwnerAnalytics(ownerData ? {
        salesTrend: ownerData.salesTrend,
        collectionTrend: ownerData.collectionTrend,
        outstandingTrend: ownerData.outstandingTrend,
        monthlyRevenue: ownerData.monthlyRevenue
      } : null);
      setTopProducts(productData.records);
      setTopProductsPage(productData);
      setSalesByCategory(categoryPageData.records);
      setSalesByCategoryPage(categoryPageData);
      setOutstandingCustomersPage(outstandingData);
      setRecentInvoicesPage(invoicesData);
    });
  }, [activeRange]);

  useEffect(() => {
    void getOwnerAnalytics(salesTrendRange)
      .then((data) => setSalesTrendData(data.salesTrend))
      .catch(() => setSalesTrendData([]));
  }, [salesTrendRange]);

  useEffect(() => {
    if (!activeCard) {
      return;
    }
    setDetailsLoading(true);
    void getDashboardDetails({
      card: activeCard,
      ...activeRange,
      page: detailPage,
      size: DEFAULT_PAGE_SIZE,
      sortBy: detailSort.sortBy,
      sortDirection: detailSort.sortDirection,
      search: detailSearch || undefined
    })
      .then(setDetails)
      .finally(() => setDetailsLoading(false));
  }, [activeCard, activeRange, detailPage, detailSearch, detailSort]);

  useEffect(() => {
    if (!activeList) {
      return;
    }
    setListLoading(true);
    const search = listSearch.trim() || undefined;
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
      .finally(() => setListLoading(false));
  }, [activeList, activeRange, listPage, listSearch]);

  const openDetails = (card: DashboardCardKey) => {
    setActiveCard(card);
    setDetails(null);
    setDetailPage(0);
    setDetailSearch("");
    setDetailSort({ sortBy: detailConfig[card].defaultSort, sortDirection: "desc" });
  };

  const openListDetails = (list: DashboardListKey) => {
    setActiveList(list);
    setListData(emptyPage<Invoice | DashboardDetailRow | TopSellingProduct | SalesByCategory | CustomerDue>());
    setListPage(0);
    setListSearch("");
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
    <div className="space-y-5 pb-6">
      <Header
        title="Dashboard"
        subtitle="Track sales, collections, open balances, and customer performance with date-based business visibility."
      />

      <GlassCard className="p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Filters</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Dashboard Filters</h2>
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
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            caption={card.caption}
            icon={card.icon}
            growth={card.growth}
            analyticsColor={card.analyticsColor}
            onClick={card.key ? () => openDetails(card.key) : undefined}
          />
        ))}
        <StatCard label="Total Expense" value={formatCurrency(summary?.totalExpense)} caption="Recorded business spend" icon={<Banknote size={18} />} />
        <StatCard label="Net Revenue" value={formatCurrency(summary?.netRevenue)} caption="Revenue minus expense" icon={<TrendingUp size={18} />} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {compactMetrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            className="group flex min-h-[92px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--theme-color)_28%,white)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.09)]"
            onClick={() => openDetails(metric.key)}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-color)_10%,white)] text-[var(--theme-color)]">
              {metric.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{metric.label}</span>
              <span className="mt-1 block text-2xl font-extrabold text-slate-950">{metric.value}</span>
              <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{metric.caption}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <GlassCard className="p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Analytics</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">Sales Trend</h2>
            </div>
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_12%,transparent)]"
              value={salesTrendPreset}
              onChange={(event) => setSalesTrendPreset(event.target.value as DatePreset)}
              aria-label="Sales trend range"
            >
              {GRAPH_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData}>
                <defs>
                  <linearGradient id="salesArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.sales} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLORS.sales} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGridColor} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartTextColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartTextColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area type="monotone" dataKey="value" stroke={CHART_COLORS.sales} strokeWidth={3} fill="url(#salesArea)" dot={{ r: 3, fill: CHART_COLORS.sales }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Products</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">Top Selling Products</h2>
            </div>
            <p className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Top 7</p>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr] xl:grid-cols-1">
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topProducts} dataKey="totalSalesAmount" nameKey="productName" innerRadius={52} outerRadius={82} paddingAngle={3}>
                    {topProducts.map((_, index) => <Cell key={index} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS.palette[index % CHART_COLORS.palette.length] }} />
                    <p className="truncate text-sm font-bold text-slate-700">{product.productName}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-950">{formatCurrency(product.totalSalesAmount)}</p>
                </div>
              ))}
            </div>
          </div>
          {topProductsPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("topProducts")}>Show More Records</Button>
            </div>
          ) : null}
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <GlassCard className="p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Recent invoices</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">Billing activity</h2>
            </div>
            <p className="text-sm text-slate-400">{recentInvoicesPage.totalRecords} invoice{recentInvoicesPage.totalRecords === 1 ? "" : "s"}</p>
          </div>
          <Table
            data={recentInvoicesPage.records}
            emptyText="No invoices fall within the selected range."
            columns={[
              { key: "invoice", header: "Invoice", render: (item) => <span className="font-semibold text-slate-950">{item.invoiceNo}</span> },
              {
                key: "customer",
                header: "Customer",
                render: (item) => (
                  <div>
                    <p className="font-semibold text-slate-950">{item.customerName}</p>
                    <p className="text-xs text-slate-400">{item.customerMobile}</p>
                  </div>
                )
              },
              { key: "date", header: "Date", render: (item) => formatDate(item.invoiceDate) },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.paymentStatus} /> },
              {
                key: "balance",
                header: "Balance",
                className: "text-right",
                render: (item) => <span className="block text-right font-semibold text-slate-950">{formatCurrency(item.balanceAmount)}</span>
              }
            ]}
          />
          {recentInvoicesPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("recentInvoices")}>Show More Records</Button>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top customers</p>
            <h2 className="mt-2 text-xl font-extrabold text-slate-950">Highest sales contribution</h2>
          </div>
          <div className="space-y-3">
            {summary?.topCustomers?.length ? (
              summary.topCustomers.slice(0, DASHBOARD_ROW_LIMIT).map((customer) => (
                <div key={customer.customerId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{customer.customerName}</p>
                      <p className="mt-1 text-sm text-slate-400">{customer.mobile}</p>
                      <p className="mt-2 text-xs text-slate-500">Last purchase: {formatDate(customer.lastPurchaseDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sales</p>
                      <p className="mt-1 font-semibold text-slate-950">{formatCurrency(customer.totalPurchaseAmount)}</p>
                      <p className="mt-2 text-xs text-slate-400">Paid: {formatCurrency(customer.totalPaidAmount)}</p>
                      <p className="text-xs text-rose-200">Outstanding: {formatCurrency(customer.outstandingBalance)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No customer activity found for the selected range.
              </div>
            )}
          </div>
          {(summary?.totalCustomers ?? 0) > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("topCustomers")}>Show More Records</Button>
            </div>
          ) : null}
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="p-5 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Categories</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-950">Sales By Category</h2>
            </div>
            <p className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Top 7</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByCategory} dataKey="totalAmount" nameKey="categoryName" innerRadius={62} outerRadius={96} paddingAngle={3}>
                  {salesByCategory.map((category, index) => (
                    <Cell
                      key={category.categoryId}
                      fill={categoryColorFor(category.categoryName, index)}
                      opacity={!activeCategoryId || activeCategoryId === category.categoryId ? 1 : 0.28}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {salesByCategory.length ? salesByCategory.map((category, index) => (
              <button
                key={category.categoryId}
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition ${activeCategoryId === category.categoryId ? "border-slate-300 bg-slate-100" : "border-transparent bg-slate-50 hover:bg-slate-100"}`}
                onClick={() => setActiveCategoryId((current) => (current === category.categoryId ? null : category.categoryId))}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: categoryColorFor(category.categoryName, index) }} />
                  <span className="truncate text-sm font-bold text-slate-700">{category.categoryName}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-extrabold text-slate-950">{formatCurrency(category.totalAmount)}</span>
                  <span className="text-xs font-bold text-slate-400">{categoryTotal ? category.percentage.toFixed(0) : "0"}%</span>
                </span>
              </button>
            )) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No category sales found for the selected range.</div>
            )}
          </div>
          {salesByCategoryPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("salesByCategory")}>Show More Records</Button>
            </div>
          ) : null}
        </GlassCard>
        <div className="space-y-4">
          <GlassCard className="p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Banknote size={20} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Outstanding</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-950">Outstanding Overview</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-rose-200/70 bg-[rgba(220,38,38,0.12)] p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Total Outstanding</p>
              <p className="mt-2 text-xl font-extrabold text-slate-950">{formatCurrency(totalOutstandingBase)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-[rgba(22,163,74,0.12)] p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Collected Amount</p>
              <p className="mt-2 text-xl font-extrabold text-slate-950">{formatCurrency(collectedAmount)}</p>
            </div>
            <div className="rounded-2xl border border-orange-200/70 bg-[rgba(249,115,22,0.12)] p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Remaining Amount</p>
              <p className="mt-2 text-xl font-extrabold text-slate-950">{formatCurrency(remainingAmount)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Collection Rate</p>
              <p className="mt-2 text-xl font-extrabold text-slate-950">{collectionRate.toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {hasOutstandingOverviewData ? (
              <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                <div className="relative h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={outstandingOverviewData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4}>
                        {outstandingOverviewData.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-slate-950">{collectionRate.toFixed(0)}%</span>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Collected</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: OUTSTANDING_WIDGET_COLORS.collected }} />
                      Collected
                    </span>
                    <span className="shrink-0 text-sm font-extrabold text-slate-950">{collectionRate.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, collectionRate)}%`, backgroundColor: OUTSTANDING_WIDGET_COLORS.collected }} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-700">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: OUTSTANDING_WIDGET_COLORS.outstanding }} />
                      Outstanding Percentage
                    </span>
                    <span className="shrink-0 text-sm font-extrabold text-slate-950">{outstandingRate.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">Collected and remaining balances are calculated from the selected dashboard range.</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[180px] items-center justify-center text-center text-sm font-semibold text-slate-500">
                No Outstanding Data Available
              </div>
            )}
          </div>
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-slate-950">Top Outstanding Customers</p>
              <p className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Top 7</p>
            </div>
            <div className="space-y-2">
              {outstandingCustomersPage.records.length ? outstandingCustomersPage.records.map((customer) => (
                <div key={customer.customerId} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-700">{customer.customerName}</p>
                    <p className="truncate text-xs text-slate-400">{customer.mobile}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-950">{formatCurrency(customer.currentBalance)}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No outstanding customers found.</div>
              )}
            </div>
            {outstandingCustomersPage.totalRecords > DASHBOARD_ROW_LIMIT ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <Button type="button" variant="secondary" className="w-full" onClick={() => openListDetails("outstandingCustomers")}>Show More Records</Button>
              </div>
            ) : null}
          </div>
          </GlassCard>

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
        onClose={() => setActiveList(null)}
        onSearchChange={(value) => {
          setListPage(0);
          setListSearch(value);
        }}
        onPageChange={setListPage}
        onExport={exportListDetails}
      />

      <Modal open={Boolean(activeCard)} title={selectedConfig?.title ?? "Dashboard Details"} onClose={() => setActiveCard(null)}>
        <div className="space-y-5">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
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
            <Button type="button" variant="secondary" onClick={exportDetails} disabled={!details?.rows.length}>
              <Download size={17} />
              Export Excel
            </Button>
          </div>

          <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-slate-200 bg-white">
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

          {details ? (
            <Pagination
              page={details.page}
              size={details.size}
              totalRecords={details.totalElements}
              totalPages={details.totalPages}
              disabled={detailsLoading}
              onPageChange={setDetailPage}
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

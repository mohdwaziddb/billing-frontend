import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Download, Eye, FileText, History, RotateCcw, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { getAuditLogCounts } from "../api/auditLogs";
import { deleteInvoice, getInvoiceSummary, getInvoicesPage, restoreInvoice, type InvoiceFilterParams, type InvoiceListSummary, type InvoiceSummaryTrendPoint } from "../api/invoices";
import { getProductCategories } from "../api/productCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { DataPortLink } from "../components/DataPortLink";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table, type Column } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { fetchAllPages } from "../lib/fetchAllPages";
import { formatDate } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { Invoice, PageResponse, ProductCategory } from "../types/api";

type DatePreset = "" | "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";
type SummaryKey = "total" | "paid" | "pending" | "partial" | "outstanding";

type InvoiceFilters = {
  search: string;
  invoiceStatus: string;
  paymentStatus: string;
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  outstandingFilter: string;
  minAmount: string;
  maxAmount: string;
  categoryId: string;
  createdByRole: string;
  recordStatus: "ACTIVE" | "DELETED" | "ALL";
};

const emptyInvoicePage: PageResponse<Invoice> = {
  records: [],
  page: 0,
  size: 20,
  totalRecords: 0,
  totalPages: 0
};

const emptyFilters: InvoiceFilters = {
  search: "",
  invoiceStatus: "",
  paymentStatus: "",
  datePreset: "",
  startDate: "",
  endDate: "",
  outstandingFilter: "",
  minAmount: "",
  maxAmount: "",
  categoryId: "",
  createdByRole: "",
  recordStatus: "ACTIVE"
};

const toIso = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Backend summary ke (date, status) points par chalta hai (pehle saare invoice rows par).
const buildInvoiceDateRange = (points: InvoiceSummaryTrendPoint[]) => {
  const timestamps = points
    .map((point) => new Date(point.invoiceDate).getTime())
    .filter((time) => !Number.isNaN(time));

  if (!timestamps.length) {
    return { startDate: "", endDate: "" };
  }

  const start = new Date(Math.min(...timestamps));
  const end = new Date(Math.max(...timestamps));
  return { startDate: toIso(start), endDate: toIso(end) };
};

const buildInvoiceTrend = (
  points: InvoiceSummaryTrendPoint[],
  startDate: string,
  endDate: string,
  valueAccessor: (point: InvoiceSummaryTrendPoint) => number = (point) => Number(point.invoiceCount ?? 0)
) => {
  if (!points.length) {
    return Array(8).fill(0);
  }

  let rangeStart = new Date(startDate).getTime();
  let rangeEnd = new Date(endDate).getTime();

  if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd) || !startDate || !endDate) {
    const range = buildInvoiceDateRange(points);
    rangeStart = new Date(range.startDate).getTime();
    rangeEnd = new Date(range.endDate).getTime();
  }

  if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) {
    return Array(8).fill(0);
  }

  if (rangeEnd < rangeStart) {
    rangeEnd = rangeStart;
  }

  const bucketCount = 8;
  const totalMs = rangeEnd - rangeStart;
  const bucketMs = totalMs > 0 ? totalMs / bucketCount : 0;
  const values = Array(bucketCount).fill(0);

  points.forEach((point) => {
    const invoiceTime = new Date(point.invoiceDate).getTime();
    if (Number.isNaN(invoiceTime) || invoiceTime < rangeStart || invoiceTime > rangeEnd) {
      return;
    }

    const bucketIndex = bucketMs === 0
      ? 0
      : Math.min(bucketCount - 1, Math.floor((invoiceTime - rangeStart) / bucketMs));

    values[bucketIndex] += valueAccessor(point);
  });

  return values;
};

const dateRangeForPreset = (preset: DatePreset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    return { startDate: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toIso(today) };
  }
  if (preset === "thisYear") {
    return { startDate: toIso(new Date(today.getFullYear(), 0, 1)), endDate: toIso(today) };
  }
  return { startDate: "", endDate: "" };
};

const buildGrandTotal = (rows: Invoice[]) => ({
  invoiceNo: "Grand Total",
  customerName: "",
  customerMobile: "",
  invoiceDate: "",
  createdBy: "",
  paymentStatus: "",
  totalAmount: rows.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0),
  paidAmount: rows.reduce((sum, item) => sum + Number(item.paidAmount ?? 0), 0),
  balanceAmount: rows.reduce((sum, item) => sum + Number(item.balanceAmount ?? 0), 0),
  __rowType: "grandTotal"
});

export const InvoiceListPage = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceListSummary | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Invoice | null>(null);
  const [logTarget, setLogTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [activeSummary, setActiveSummary] = useState<SummaryKey | null>(null);
  const [modalPage, setModalPage] = useState(0);
  const [modalSearch, setModalSearch] = useState("");
  const [modalInvoices, setModalInvoices] = useState<Invoice[]>([]);
  const [modalInvoicePage, setModalInvoicePage] = useState<PageResponse<Invoice>>(emptyInvoicePage);
  const [logCounts, setLogCounts] = useState<Record<number, number>>({});
  const { can } = useAuth();
  const { setApiError } = useApiMessage();

  const list = useListPage<Invoice, InvoiceFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load invoices",
    fetchPage: ({ page, size, filters }) => getInvoicesPage({ ...buildParams(filters), page, size })
  });

  // KPI cards backend aggregate se. Pehle har page load / filter par fetchAllPages se 50k tak
  // invoices (items samet) aate the sirf ginne ke liye — bade tenant par page minto atakta tha.
  // Request id: filter jaldi badle to purana jawab naya data overwrite na kare.
  const summaryRequestId = useRef(0);
  const loadSummary = async (filters: InvoiceFilters) => {
    const requestId = ++summaryRequestId.current;
    const summaryData = await getInvoiceSummary(buildParams(filters));
    if (requestId === summaryRequestId.current) {
      setInvoiceSummary(summaryData);
    }
  };

  useEffect(() => {
    void getProductCategories({ active: true, size: 1000 })
      .then(setCategories)
      .catch((err: any) => setApiError(err, "Unable to load invoices"));
  }, [setApiError]);

  useEffect(() => {
    void loadSummary(list.activeFilters).catch((err: any) => setApiError(err, "Unable to load invoices"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.activeFilters]);

  const trendPoints = useMemo(() => invoiceSummary?.trend ?? [], [invoiceSummary]);

  const baseParams = useMemo(() => buildParams(list.activeFilters), [list.activeFilters]);
  const activeFilterSummary = useMemo(() => summarizeInvoiceFilters(list.activeFilters, categories), [list.activeFilters, categories]);

  const currentTrendRange = useMemo(() => {
    const presetRange = list.activeFilters.datePreset === "custom"
      ? { startDate: list.activeFilters.startDate, endDate: list.activeFilters.endDate }
      : dateRangeForPreset(list.activeFilters.datePreset);

    if (presetRange.startDate && presetRange.endDate) {
      return presetRange;
    }

    return buildInvoiceDateRange(trendPoints);
  }, [list.activeFilters, trendPoints]);

  // Sparkline = period me ab tak ka running total. Pehle har din ka alag count tha (beech ke
  // khaali din par "V" gaddha) aur badge aakhri din vs pichhla din compare karta (0 se = "+100%").
  const runningTotal = (trend: number[]) => {
    let total = 0;
    const cumulative = trend.map((value) => (total += Number(value) || 0));
    // Sab zero = sapaat line ka koi matlab nahi (Partial "0" par kaali line dikhti thi) — sparkline hi mat dikhao.
    return total > 0 ? cumulative : undefined;
  };

  const countTrend = (status?: string) => (point: InvoiceSummaryTrendPoint) =>
    !status || point.paymentStatus === status ? Number(point.invoiceCount ?? 0) : 0;

  const totalInvoiceTrend = useMemo(
    () => buildInvoiceTrend(trendPoints, currentTrendRange.startDate, currentTrendRange.endDate, countTrend()),
    [trendPoints, currentTrendRange]
  );

  const paidInvoiceTrend = useMemo(
    () => buildInvoiceTrend(trendPoints, currentTrendRange.startDate, currentTrendRange.endDate, countTrend("PAID")),
    [trendPoints, currentTrendRange]
  );

  const pendingInvoiceTrend = useMemo(
    () => buildInvoiceTrend(trendPoints, currentTrendRange.startDate, currentTrendRange.endDate, countTrend("UNPAID")),
    [trendPoints, currentTrendRange]
  );

  const partialInvoiceTrend = useMemo(
    () => buildInvoiceTrend(trendPoints, currentTrendRange.startDate, currentTrendRange.endDate, countTrend("PARTIAL")),
    [trendPoints, currentTrendRange]
  );

  const outstandingTrend = useMemo(
    () => buildInvoiceTrend(trendPoints, currentTrendRange.startDate, currentTrendRange.endDate, (point) => Number(point.balanceAmount ?? 0)),
    [trendPoints, currentTrendRange]
  );

  const summary = useMemo(() => ({
    total: Number(invoiceSummary?.totalInvoices ?? 0),
    paid: Number(invoiceSummary?.paidInvoices ?? 0),
    pending: Number(invoiceSummary?.pendingInvoices ?? 0),
    partial: Number(invoiceSummary?.partialInvoices ?? 0),
    outstandingAmount: Number(invoiceSummary?.outstandingAmount ?? 0)
  }), [invoiceSummary]);

  // Boolean dep: `can` ki identity auth update par badalti hai (log counts baar-baar aate the).
  const canViewLogs = can("INVOICES", "LOGS");
  useEffect(() => {
    const ids = [...new Set([...list.tableData, ...modalInvoices].map((invoice) => invoice.id))];
    if (!canViewLogs || !ids.length) {
      setLogCounts({});
      return;
    }
    // Ek call me saare rows (pehle har row ki alag /audit-logs request: 20 rows = 20 calls).
    void getAuditLogCounts("Invoice", ids).then(setLogCounts).catch(() => setLogCounts({}));
  }, [canViewLogs, list.tableData, modalInvoices]);

  useEffect(() => {
    if (!activeSummary) {
      return;
    }
    const params = summaryParams(baseParams, activeSummary, modalSearch);
    let cancelled = false;
    // Modal search par har keystroke ki request nahi: thoda ruk kar (page badalna bhi isi se).
    const timeoutId = window.setTimeout(() => {
      void getInvoicesPage({ ...params, page: modalPage, size: 20 })
        .then((response) => {
          if (cancelled) {
            return;
          }
          setModalInvoicePage(response);
          setModalInvoices(response.records);
        })
        .catch((err: any) => {
          if (!cancelled) {
            setApiError(err, "Unable to load invoice details");
          }
        });
    }, modalSearch ? 300 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeSummary, baseParams, modalPage, modalSearch, setApiError]);

  // Excel export: saare rows sirf button dabane par (pehle har page load par hi aa jaate the).
  const exportAllInvoices = async () => {
    try {
      setExporting(true);
      const rows = await fetchAllPages((page, size) => getInvoicesPage({ ...buildParams(list.activeFilters), page, size }));
      exportInvoices("invoices.xlsx", rows);
    } catch (err: any) {
      setApiError(err, "Unable to export invoices");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      await deleteInvoice(deleteTarget.id);
      list.refreshTable();
      await loadSummary(list.activeFilters);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Invoice"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) {
      return;
    }
    try {
      setRestoringId(restoreTarget.id);
      await restoreInvoice(restoreTarget.id);
      setRestoreTarget(null);
      list.refreshTable();
      await loadSummary(list.activeFilters);
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Invoice"));
    } catch (err: any) {
      setApiError(err, "Unable to restore invoice");
    } finally {
      setRestoringId(null);
    }
  };

  const exportInvoices = (fileName: string, rows: Invoice[]) => {
    const exportData = rows.length ? [...rows, buildGrandTotal(rows)] : [];
    exportToExcel(fileName, exportData, invoiceExportColumns);
  };

  const openSummary = (key: SummaryKey) => {
    setActiveSummary(key);
    setModalPage(0);
    setModalSearch("");
  };

  const invoiceColumns = useMemo<Column<Invoice>[]>(() => [
    { key: "invoice", header: "Invoice No", render: (item) => (
      // "Created by" alag column ki jagah yahan chhota — 1366px screen par Actions scroll ke peeche chala jata tha.
      <div className="min-w-[150px] max-w-[190px]">
        <p className="break-words font-semibold text-white">{item.invoiceNo}</p>
        {item.createdBy ? <p className="mt-0.5 whitespace-nowrap fs-12 text-slate-500">by {item.createdBy}</p> : null}
      </div>
    ) },
    { key: "date", header: "Date", render: (item) => <span className="whitespace-nowrap">{formatDate(item.invoiceDate)}</span> },
    {
      key: "customer",
      header: "Customer",
      render: (item) => (
        // Mobile alag column ki jagah naam ke neeche — alag column se table chaudi ho kar Status/Actions kat jaate the.
        <div className="whitespace-nowrap">
          <p className="font-semibold text-white">{item.customerName}</p>
          {item.customerMobile ? <p className="mt-0.5 fs-12 text-slate-500">{item.customerMobile}</p> : null}
        </div>
      )
    },
    { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.totalAmount)}</span> },
    { key: "paid", header: "Paid", className: "text-right", render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.paidAmount)}</span> },
    { key: "outstanding", header: "Outstanding", className: "text-right", render: (item) => <span className={`block whitespace-nowrap text-right font-semibold ${Number(item.balanceAmount) > 0 ? "text-rose-600" : "text-slate-500"}`}>{formatCurrency(item.balanceAmount)}</span> },
    { key: "status", header: "Status", render: (item) => <div className="flex flex-wrap gap-2"><StatusBadge label={item.paymentStatus} />{item.deleted ? <StatusBadge label="Deleted" /> : null}</div> }
  ], []);

  const buildTableColumns = (canDelete: boolean): Column<Invoice>[] => [
    ...applyVisibleColumns(invoiceColumns, visibleColumns),
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        <ActionDropdown
          actions={[
            // Deleted invoice ka detail API 404 deta hai — View sirf active par.
            { label: "View", icon: <Eye size={15} />, to: `/invoices/${item.id}`, hidden: item.deleted },
            { label: "Show Logs", icon: <History size={15} />, hidden: !can("INVOICES", "LOGS") || !logCounts[item.id], onClick: () => setLogTarget(item) },
            { label: restoringId === item.id ? "Restoring..." : "Restore", icon: <RotateCcw size={15} />, hidden: !item.deleted || !can("INVOICES", "RESTORE"), onClick: () => setRestoreTarget(item) },
            { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: item.deleted || !canDelete, onClick: () => setDeleteTarget(item) }
          ]}
        />
      )
    }
  ];

  return (
    <CommonListPage<Invoice, InvoiceFilters>
      pageTitle="Invoices"
      pageSubtitle="Search, filter, analyze, and export invoices from one billing ledger."
      list={list}
      searchPlaceholder="Search Invoice"
      activeFilterCount={() => activeFilterSummary.length}
      filterPanelWidth="max-w-[720px]"
      filtersClassName="grid gap-3 md:grid-cols-2"
      statCards={
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Invoices"
            value={String(summary.total)}
            caption="Current filtered invoices"
            icon={<FileText size={18} />}
            trend={runningTotal(totalInvoiceTrend)}
            onClick={() => openSummary("total")}
          />
          <StatCard
            label="Paid Invoices"
            value={String(summary.paid)}
            caption="Fully paid invoices"
            icon={<CheckCircle size={18} />}
            trend={runningTotal(paidInvoiceTrend)}
            onClick={() => openSummary("paid")}
          />
          <StatCard
            label="Pending Invoices"
            value={String(summary.pending)}
            caption="Unpaid invoices"
            icon={<Clock size={18} />}
            trend={runningTotal(pendingInvoiceTrend)}
            onClick={() => openSummary("pending")}
          />
          <StatCard
            label="Partial Invoices"
            value={String(summary.partial)}
            caption="Partially paid invoices"
            icon={<AlertCircle size={18} />}
            trend={runningTotal(partialInvoiceTrend)}
            onClick={() => openSummary("partial")}
          />
          <StatCard
            label="Outstanding Amount"
            value={formatCurrency(summary.outstandingAmount)}
            caption="Current filtered balance"
            icon={<Wallet size={18} />}
            trend={runningTotal(outstandingTrend)}
            onClick={() => openSummary("outstanding")}
          />
        </div>
      }
      filterFields={
        <>
          <Select label="Invoice Status" value={list.formFilters.invoiceStatus} options={[
            { label: "All", value: "" },
            { label: "Draft", value: "DRAFT" },
            { label: "Pending", value: "PENDING" },
            { label: "Partial Paid", value: "PARTIAL_PAID" },
            { label: "Paid", value: "PAID" },
            { label: "Cancelled", value: "CANCELLED" }
          ]} onChange={(event) => list.updateFormFilters({ invoiceStatus: event.target.value })} />
          <Select label="Payment Status" value={list.formFilters.paymentStatus} options={[
            { label: "All", value: "" },
            { label: "Unpaid", value: "UNPAID" },
            { label: "Partial", value: "PARTIAL" },
            { label: "Fully Paid", value: "PAID" }
          ]} onChange={(event) => list.updateFormFilters({ paymentStatus: event.target.value })} />
          <Select label="Invoice Date" value={list.formFilters.datePreset} options={[
            { label: "All", value: "" },
            { label: "Today", value: "today" },
            { label: "Yesterday", value: "yesterday" },
            { label: "This Week", value: "thisWeek" },
            { label: "This Month", value: "thisMonth" },
            { label: "This Year", value: "thisYear" },
            { label: "Custom Date Range", value: "custom" }
          ]} onChange={(event) => list.updateFormFilters({ datePreset: event.target.value as DatePreset })} />
          {list.formFilters.datePreset === "custom" ? (
            <>
              <Input label="Start Date" type="date" value={list.formFilters.startDate} onChange={(event) => list.updateFormFilters({ startDate: event.target.value })} />
              <Input label="End Date" type="date" value={list.formFilters.endDate} onChange={(event) => list.updateFormFilters({ endDate: event.target.value })} />
            </>
          ) : null}
          <Select label="Outstanding Filter" value={list.formFilters.outstandingFilter} options={[
            { label: "All", value: "" },
            { label: "Outstanding > 0", value: "OUTSTANDING" },
            { label: "Fully Paid", value: "FULLY_PAID" },
            { label: "Partial Outstanding", value: "PARTIAL_OUTSTANDING" }
          ]} onChange={(event) => list.updateFormFilters({ outstandingFilter: event.target.value })} />
          <Input label="Min Amount" placeholder="Enter minimum amount" type="number" value={list.formFilters.minAmount} onChange={(event) => list.updateFormFilters({ minAmount: event.target.value })} />
          <Input label="Max Amount" placeholder="Enter maximum amount" type="number" value={list.formFilters.maxAmount} onChange={(event) => list.updateFormFilters({ maxAmount: event.target.value })} />
          <Select label="Product Category" value={list.formFilters.categoryId} options={[
            { label: "All Categories", value: "" },
            ...categories.map((category) => ({ label: category.categoryName, value: String(category.id) }))
          ]} onChange={(event) => list.updateFormFilters({ categoryId: event.target.value })} />
          <Select label="Created By" value={list.formFilters.createdByRole} options={[
            { label: "All Users", value: "" },
            { label: "Owner", value: "OWNER" },
            { label: "Admin", value: "ADMIN" },
            { label: "User", value: "USER" }
          ]} onChange={(event) => list.updateFormFilters({ createdByRole: event.target.value })} />
          <Select label="Record Status" value={list.formFilters.recordStatus} options={[
            { label: "Active", value: "ACTIVE" },
            { label: "Deleted", value: "DELETED" },
            { label: "All", value: "ALL" }
          ]} onChange={(event) => list.updateFormFilters({ recordStatus: event.target.value as InvoiceFilters["recordStatus"] })} />
        </>
      }
      toolbarButtons={
        can("INVOICES", "EXPORT") || can("CREATE_INVOICE", "ADD") || can("INVOICE_DATAPORT", "VIEW") ? (
          <>
            {can("INVOICES", "EXPORT") ? (
              <Button type="button" variant="secondary" disabled={exporting || !summary.total} onClick={() => void exportAllInvoices()}>
                <Download size={16} />
                {exporting ? "Exporting..." : "Export Excel"}
              </Button>
            ) : null}
            <DataPortLink menuCode="INVOICE_DATAPORT" moduleKey="invoices" />
            {can("CREATE_INVOICE", "ADD") ? (
              <Link to="/create-invoice">
                <Button>Create Invoice</Button>
              </Link>
            ) : null}
          </>
        ) : null
      }
      columnSelector={{ tableName: "INVOICES", columns: invoiceColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["invoice"] }}
      tableColumns={buildTableColumns(can("INVOICES", "DELETE"))}
      emptyMessage="No invoices match the selected filters."
      fullHeight
      modals={
        <>
          <Modal open={Boolean(activeSummary)} title={summaryTitle(activeSummary)} onClose={() => setActiveSummary(null)}>
            <div className="space-y-5">
              <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-950">Active Filters:</span>
                <span className="min-w-0 flex-1 text-slate-600">
                  {[summaryTitle(activeSummary), ...activeFilterSummary].filter(Boolean).join(" | ")}
                </span>
                <span className="font-semibold text-slate-950">Records: {modalInvoicePage.totalRecords}</span>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Input label="Search Modal Invoices" placeholder="Search by invoice no, customer name or mobile number" value={modalSearch} onChange={(event) => {
                  setModalPage(0);
                  setModalSearch(event.target.value);
                }} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="button" variant="secondary" disabled={!modalInvoices.length} onClick={() => exportInvoices(`${activeSummary ?? "invoice"}-details.xlsx`, modalInvoices)}>
                  <Download size={17} />
                  Export Excel
                </Button>
                <div className="flex justify-end"><Pagination
                  page={modalInvoicePage.page}
                  size={modalInvoicePage.size}
                  totalRecords={modalInvoicePage.totalRecords}
                  totalPages={modalInvoicePage.totalPages}
                  onPageChange={setModalPage}
                layout="inline" /></div>
              </div>
              </div>
              <Table
                data={modalInvoices}
                emptyText="No invoices match the selected filters."
                columns={buildTableColumns(false)}
              />
            </div>
          </Modal>

          <AuditLogModal open={Boolean(logTarget)} moduleName="Invoice" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.invoiceNo} Logs` : "Invoice Logs"} onClose={() => setLogTarget(null)} />
          <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
          <Modal open={Boolean(restoreTarget)} title="Restore Invoice" onClose={() => restoringId === null && setRestoreTarget(null)}>
            <p className="text-sm leading-6 text-slate-600">
              Restore invoice <span className="font-bold text-slate-950">{restoreTarget?.invoiceNo}</span>? It will become active again with its payments intact.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" disabled={restoringId !== null} onClick={() => setRestoreTarget(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={restoringId !== null} onClick={() => void handleRestore()}>
                {restoringId !== null ? "Restoring..." : "Restore"}
              </Button>
            </div>
          </Modal>
        </>
      }
    />
  );
};

const buildParams = (filters: InvoiceFilters): InvoiceFilterParams => {
  const presetRange = filters.datePreset === "custom" ? { startDate: filters.startDate, endDate: filters.endDate } : dateRangeForPreset(filters.datePreset);
  return {
    search: filters.search.trim() || undefined,
    invoiceStatus: filters.invoiceStatus || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    startDate: presetRange.startDate || undefined,
    endDate: presetRange.endDate || undefined,
    outstandingFilter: filters.outstandingFilter || undefined,
    minAmount: filters.minAmount || undefined,
    maxAmount: filters.maxAmount || undefined,
    categoryId: filters.categoryId || undefined,
    createdByRole: filters.createdByRole || undefined,
    recordStatus: filters.recordStatus
  };
};

const summarizeInvoiceFilters = (filters: InvoiceFilters, categories: ProductCategory[]) => {
  const summary: string[] = [];
  const invoiceStatusLabels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING: "Pending",
    PARTIAL_PAID: "Partial Paid",
    PAID: "Paid",
    CANCELLED: "Cancelled"
  };
  const paymentStatusLabels: Record<string, string> = {
    UNPAID: "Unpaid",
    PARTIAL: "Partial",
    PAID: "Fully Paid"
  };
  const datePresetLabels: Record<DatePreset, string> = {
    "": "",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",
    thisYear: "This Year",
    custom: "Custom Date"
  };
  const outstandingLabels: Record<string, string> = {
    OUTSTANDING: "Outstanding > 0",
    FULLY_PAID: "Fully Paid",
    PARTIAL_OUTSTANDING: "Partial Outstanding"
  };
  const roleLabels: Record<string, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    USER: "User"
  };
  const recordStatusLabels: Record<InvoiceFilters["recordStatus"], string> = {
    ACTIVE: "Active Records",
    DELETED: "Deleted Records",
    ALL: "All Records"
  };

  if (filters.search.trim()) summary.push(`Search: ${filters.search.trim()}`);
  if (filters.invoiceStatus) summary.push(invoiceStatusLabels[filters.invoiceStatus] ?? filters.invoiceStatus);
  if (filters.paymentStatus) summary.push(paymentStatusLabels[filters.paymentStatus] ?? filters.paymentStatus);
  if (filters.datePreset === "custom" && (filters.startDate || filters.endDate)) {
    summary.push(`${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`);
  } else if (filters.datePreset) {
    summary.push(datePresetLabels[filters.datePreset]);
  }
  if (filters.outstandingFilter) summary.push(outstandingLabels[filters.outstandingFilter] ?? filters.outstandingFilter);
  if (filters.minAmount) summary.push(`Amount >= ${filters.minAmount}`);
  if (filters.maxAmount) summary.push(`Amount <= ${filters.maxAmount}`);
  if (filters.categoryId) {
    const category = categories.find((item) => String(item.id) === filters.categoryId);
    summary.push(category?.categoryName ?? "Selected Category");
  }
  if (filters.createdByRole) summary.push(`Created By: ${roleLabels[filters.createdByRole] ?? filters.createdByRole}`);
  if (filters.recordStatus !== "ACTIVE") summary.push(recordStatusLabels[filters.recordStatus]);
  return summary;
};

const summaryParams = (params: InvoiceFilterParams, key: SummaryKey, search: string): InvoiceFilterParams => {
  const next: InvoiceFilterParams = { ...params, search: search.trim() || params.search };
  if (key === "paid") {
    next.paymentStatus = "PAID";
  }
  if (key === "pending") {
    next.paymentStatus = "UNPAID";
  }
  if (key === "partial") {
    next.paymentStatus = "PARTIAL";
  }
  if (key === "outstanding") {
    next.outstandingFilter = "OUTSTANDING";
  }
  return next;
};

const summaryTitle = (key: SummaryKey | null) => {
  if (key === "paid") return "Paid Invoice Details";
  if (key === "pending") return "Pending Invoice Details";
  if (key === "partial") return "Partial Invoice Details";
  if (key === "outstanding") return "Outstanding Invoice Details";
  return "Invoice Details";
};

const invoiceExportColumns = [
  { key: "invoiceNo", header: "Invoice Number" },
  { key: "invoiceDate", header: "Invoice Date", type: "date" as const },
  { key: "customerName", header: "Customer Name" },
  { key: "customerMobile", header: "Mobile Number" },
  { key: "totalAmount", header: "Amount", type: "amount" as const },
  { key: "paidAmount", header: "Paid Amount", type: "amount" as const },
  { key: "balanceAmount", header: "Outstanding", type: "amount" as const },
  { key: "paymentStatus", header: "Status" },
  { key: "deleted", header: "Record Status", value: (row: Invoice | Record<string, unknown>) => (row as Invoice).deleted ? "Deleted" : "Active" },
  { key: "createdBy", header: "Created By" }
];

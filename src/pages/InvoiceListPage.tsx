import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Download, Eye, FileText, History, Trash2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { getAuditLogs } from "../api/auditLogs";
import { deleteInvoice, getInvoicesPage, type InvoiceFilterParams } from "../api/invoices";
import { getProductCategories } from "../api/productCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonAdvancedFilterPanel } from "../components/CommonAdvancedFilterPanel";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
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
};

const emptyInvoicePage: PageResponse<Invoice> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

const todayIso = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyFilters: InvoiceFilters = {
  search: "",
  invoiceStatus: "",
  paymentStatus: "",
  datePreset: "today",
  startDate: todayIso(),
  endDate: todayIso(),
  outstandingFilter: "",
  minAmount: "",
  maxAmount: "",
  categoryId: "",
  createdByRole: ""
};

const toIso = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState<PageResponse<Invoice>>(emptyInvoicePage);
  const [page, setPage] = useState(0);
  const [draftFilters, setDraftFilters] = useState<InvoiceFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<InvoiceFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [exportRows, setExportRows] = useState<Invoice[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [logTarget, setLogTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeSummary, setActiveSummary] = useState<SummaryKey | null>(null);
  const [modalPage, setModalPage] = useState(0);
  const [modalSearch, setModalSearch] = useState("");
  const [modalInvoices, setModalInvoices] = useState<Invoice[]>([]);
  const [modalInvoicePage, setModalInvoicePage] = useState<PageResponse<Invoice>>(emptyInvoicePage);
  const [logCounts, setLogCounts] = useState<Record<number, number>>({});
  const { can } = useAuth();
  const { setApiError } = useApiMessage();

  const baseParams = useMemo(() => buildParams(appliedFilters), [appliedFilters]);
  const activeFilterSummary = useMemo(() => summarizeInvoiceFilters(appliedFilters, categories), [appliedFilters, categories]);
  const summary = useMemo(() => ({
    total: exportRows.length,
    paid: exportRows.filter((item) => item.paymentStatus === "PAID").length,
    pending: exportRows.filter((item) => item.paymentStatus === "UNPAID").length,
    partial: exportRows.filter((item) => item.paymentStatus === "PARTIAL").length,
    outstandingAmount: exportRows.reduce((sum, item) => sum + Number(item.balanceAmount ?? 0), 0)
  }), [exportRows]);

  const loadInvoices = async (nextPage = page, params = baseParams) => {
    const response = await getInvoicesPage({ ...params, page: nextPage, size: DEFAULT_PAGE_SIZE });
    setInvoicePage(response);
    setInvoices(response.records);
  };

  const loadExportRows = async (params = baseParams) => {
    const response = await getInvoicesPage({ ...params, page: 0, size: 1000 });
    setExportRows(response.records);
  };

  useEffect(() => {
    void Promise.all([
      loadInvoices(0),
      loadExportRows(),
      getProductCategories({ active: true, size: 1000 }).then(setCategories)
    ]).catch((err: any) => setApiError(err, "Unable to load invoices"));
  }, [baseParams]);

  useEffect(() => {
    const ids = [...new Set([...invoices, ...modalInvoices].map((invoice) => invoice.id))];
    if (!can("INVOICES", "LOGS") || !ids.length) {
      setLogCounts({});
      return;
    }
    void loadLogCounts("Invoice", ids).then(setLogCounts).catch(() => setLogCounts({}));
  }, [can, invoices, modalInvoices]);

  useEffect(() => {
    if (!activeSummary) {
      return;
    }
    const params = summaryParams(baseParams, activeSummary, modalSearch);
    void getInvoicesPage({ ...params, page: modalPage, size: DEFAULT_PAGE_SIZE })
      .then((response) => {
        setModalInvoicePage(response);
        setModalInvoices(response.records);
      })
      .catch((err: any) => setApiError(err, "Unable to load invoice details"));
  }, [activeSummary, baseParams, modalPage, modalSearch]);

  const applyFilters = () => {
    setPage(0);
    setAppliedFilters(draftFilters);
    setFiltersOpen(false);
  };

  const clearSearchFilter = () => {
    const nextFilters = { ...draftFilters, search: "" };
    setPage(0);
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setPage(0);
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFiltersOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      await deleteInvoice(deleteTarget.id);
      await loadInvoices(page);
      await loadExportRows();
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Invoice"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
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

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Invoices" subtitle="Search, filter, analyze, and export invoices from one billing ledger." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Invoices" value={String(summary.total)} caption="Current filtered invoices" icon={<FileText size={18} />} onClick={() => openSummary("total")} />
        <StatCard label="Paid Invoices" value={String(summary.paid)} caption="Fully paid invoices" icon={<CheckCircle size={18} />} onClick={() => openSummary("paid")} />
        <StatCard label="Pending Invoices" value={String(summary.pending)} caption="Unpaid invoices" icon={<Clock size={18} />} onClick={() => openSummary("pending")} />
        <StatCard label="Partial Invoices" value={String(summary.partial)} caption="Partially paid invoices" icon={<AlertCircle size={18} />} onClick={() => openSummary("partial")} />
        <StatCard label="Outstanding Amount" value={formatCurrency(summary.outstandingAmount)} caption="Current filtered balance" icon={<Wallet size={18} />} onClick={() => openSummary("outstanding")} />
      </div>

      <CommonAdvancedFilterPanel
        title="Advanced Invoice Search"
        eyebrow="Invoice Filters"
        expanded={filtersOpen}
        activeFilters={activeFilterSummary}
        onToggle={() => setFiltersOpen((current) => !current)}
        onClearAll={resetFilters}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Search Invoice" placeholder="Search by invoice no, customer name or mobile number" value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} onClear={clearSearchFilter} />
          <Select label="Invoice Status" value={draftFilters.invoiceStatus} options={[
            { label: "All", value: "" },
            { label: "Draft", value: "DRAFT" },
            { label: "Pending", value: "PENDING" },
            { label: "Partial Paid", value: "PARTIAL_PAID" },
            { label: "Paid", value: "PAID" },
            { label: "Cancelled", value: "CANCELLED" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, invoiceStatus: event.target.value }))} />
          <Select label="Payment Status" value={draftFilters.paymentStatus} options={[
            { label: "All", value: "" },
            { label: "Unpaid", value: "UNPAID" },
            { label: "Partial", value: "PARTIAL" },
            { label: "Fully Paid", value: "PAID" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, paymentStatus: event.target.value }))} />
          <Select label="Invoice Date" value={draftFilters.datePreset} options={[
            { label: "All", value: "" },
            { label: "Today", value: "today" },
            { label: "Yesterday", value: "yesterday" },
            { label: "This Week", value: "thisWeek" },
            { label: "This Month", value: "thisMonth" },
            { label: "This Year", value: "thisYear" },
            { label: "Custom Date Range", value: "custom" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, datePreset: event.target.value as DatePreset }))} />
          {draftFilters.datePreset === "custom" ? (
            <>
              <Input label="Start Date" type="date" value={draftFilters.startDate} onChange={(event) => setDraftFilters((current) => ({ ...current, startDate: event.target.value }))} />
              <Input label="End Date" type="date" value={draftFilters.endDate} onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))} />
            </>
          ) : null}
          <Select label="Outstanding Filter" value={draftFilters.outstandingFilter} options={[
            { label: "All", value: "" },
            { label: "Outstanding > 0", value: "OUTSTANDING" },
            { label: "Fully Paid", value: "FULLY_PAID" },
            { label: "Partial Outstanding", value: "PARTIAL_OUTSTANDING" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, outstandingFilter: event.target.value }))} />
          <Input label="Min Amount" placeholder="Enter minimum amount" type="number" value={draftFilters.minAmount} onChange={(event) => setDraftFilters((current) => ({ ...current, minAmount: event.target.value }))} />
          <Input label="Max Amount" placeholder="Enter maximum amount" type="number" value={draftFilters.maxAmount} onChange={(event) => setDraftFilters((current) => ({ ...current, maxAmount: event.target.value }))} />
          <Select label="Product Category" value={draftFilters.categoryId} options={[
            { label: "All Categories", value: "" },
            ...categories.map((category) => ({ label: category.categoryName, value: String(category.id) }))
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, categoryId: event.target.value }))} />
          <Select label="Created By" value={draftFilters.createdByRole} options={[
            { label: "All Users", value: "" },
            { label: "Owner", value: "OWNER" },
            { label: "Admin", value: "ADMIN" },
            { label: "User", value: "USER" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, createdByRole: event.target.value }))} />
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={applyFilters}>Apply Filters</Button>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" className="w-full" onClick={resetFilters}>Reset Filters</Button>
          </div>
        </div>
      </CommonAdvancedFilterPanel>

      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Invoices" }]} />
          </div>
          {can("INVOICES", "EXPORT") || can("CREATE_INVOICE", "ADD") ? (
            <div className="flex flex-wrap gap-2">
              {can("INVOICES", "EXPORT") ? (
                <Button type="button" variant="secondary" disabled={!exportRows.length} onClick={() => exportInvoices("invoices.xlsx", exportRows)}>
                  <Download size={16} />
                  Export Excel
                </Button>
              ) : null}
              {can("CREATE_INVOICE", "ADD") ? (
                <Link to="/create-invoice">
                  <Button>Create Invoice</Button>
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex-1">
          <InvoiceTable invoices={invoices} logCounts={logCounts} canDelete={can("INVOICES", "DELETE")} canViewLogs={can("INVOICES", "LOGS")} canAdd={can("CREATE_INVOICE", "ADD")} onDelete={setDeleteTarget} onShowLogs={setLogTarget} />
        </div>
        <div className="mt-auto">
          <Pagination
          page={invoicePage.page}
          size={invoicePage.size}
          totalRecords={invoicePage.totalRecords}
          totalPages={invoicePage.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadInvoices(nextPage);
          }}
          />
        </div>
      </GlassCard>

      <Modal open={Boolean(activeSummary)} title={summaryTitle(activeSummary)} onClose={() => setActiveSummary(null)}>
        <div className="space-y-5">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-950">Active Filters:</span>
            <span className="min-w-0 flex-1 text-slate-600">{summaryTitle(activeSummary)}</span>
            <span className="font-semibold text-slate-950">Records: {modalInvoicePage.totalRecords}</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input label="Search Modal Invoices" placeholder="Search by invoice no, customer name or mobile number" value={modalSearch} onChange={(event) => {
              setModalPage(0);
              setModalSearch(event.target.value);
            }} />
            <Button type="button" variant="secondary" disabled={!modalInvoices.length} onClick={() => exportInvoices(`${activeSummary ?? "invoice"}-details.xlsx`, modalInvoices)}>
              <Download size={17} />
              Export Excel
            </Button>
          </div>
          <InvoiceTable invoices={modalInvoices} logCounts={logCounts} canDelete={false} canViewLogs={can("INVOICES", "LOGS")} onDelete={setDeleteTarget} onShowLogs={setLogTarget} />
          <Pagination
            page={modalInvoicePage.page}
            size={modalInvoicePage.size}
            totalRecords={modalInvoicePage.totalRecords}
            totalPages={modalInvoicePage.totalPages}
            onPageChange={setModalPage}
          />
        </div>
      </Modal>

      <AuditLogModal open={Boolean(logTarget)} moduleName="Invoice" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.invoiceNo} Logs` : "Invoice Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
    </div>
  );
};

const InvoiceTable = ({ invoices, logCounts, canDelete, canViewLogs = false, canAdd = false, onDelete, onShowLogs }: { invoices: Invoice[]; logCounts: Record<number, number>; canDelete: boolean; canViewLogs?: boolean; canAdd?: boolean; onDelete: (invoice: Invoice) => void; onShowLogs?: (invoice: Invoice) => void }) => (
  <Table
    data={invoices}
    emptyText="No invoices match the selected filters."
    emptyAction={canAdd ? <Link to="/create-invoice"><Button>Create Invoice</Button></Link> : null}
    columns={[
      { key: "invoice", header: "Invoice No", render: (item) => <span className="font-semibold text-white">{item.invoiceNo}</span> },
      { key: "date", header: "Date", render: (item) => formatDate(item.invoiceDate) },
      {
        key: "customer",
        header: "Customer",
        render: (item) => (
          <div>
            <p className="font-semibold text-white">{item.customerName}</p>
            <p className="text-xs text-slate-400">{item.customerMobile}</p>
          </div>
        )
      },
      { key: "mobile", header: "Mobile", render: (item) => item.customerMobile },
      { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.totalAmount)}</span> },
      { key: "paid", header: "Paid Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.paidAmount)}</span> },
      { key: "outstanding", header: "Outstanding", className: "text-right", render: (item) => <span className="block text-right font-semibold text-rose-200">{formatCurrency(item.balanceAmount)}</span> },
      { key: "status", header: "Status", render: (item) => <StatusBadge label={item.paymentStatus} /> },
      { key: "createdBy", header: "Created By", render: (item) => item.createdBy ?? "--" },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (item) => (
          <ActionDropdown
            actions={[
              { label: "View", icon: <Eye size={15} />, to: `/invoices/${item.id}` },
              { label: "Show Logs", icon: <History size={15} />, hidden: !canViewLogs || !logCounts[item.id], onClick: () => onShowLogs?.(item) },
              { label: "Delete", icon: <Trash2 size={15} />, danger: true, hidden: !canDelete, onClick: () => onDelete(item) }
            ]}
          />
        )
      }
    ]}
  />
);

const loadLogCounts = async (moduleName: string, ids: number[]) => {
  const entries = await Promise.all(ids.map(async (entityId) => {
    const response = await getAuditLogs({ moduleName, entityId, page: 0, size: 1 });
    return [entityId, response.totalRecords] as const;
  }));
  return Object.fromEntries(entries);
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
    createdByRole: filters.createdByRole || undefined
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
  { key: "createdBy", header: "Created By" }
];

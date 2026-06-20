import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CreditCard, Download, History, RotateCcw, Send, Wallet } from "lucide-react";
import { getAuditLogs } from "../api/auditLogs";
import { sendEmailNotification, sendSmsNotification, sendWhatsAppNotification } from "../api/notifications";
import { getPaymentModes } from "../api/paymentModes";
import { deletePayment, getPaymentsPage, restorePayment, type PaymentFilterParams } from "../api/payments";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonAdvancedFilterPanel } from "../components/CommonAdvancedFilterPanel";
import { CommonColumnSelector, applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
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
import type { PageResponse, Payment, PaymentModeMaster } from "../types/api";

type DatePreset = "" | "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";
type SummaryKey = "total" | "collection" | "outstanding" | `mode:${string}`;

type PaymentFilters = {
  search: string;
  paymentStatus: string;
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  mode: string;
  createdByRole: string;
  recordStatus: "ACTIVE" | "DELETED" | "ALL";
};

const emptyPaymentPage: PageResponse<Payment> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

const emptyFilters: PaymentFilters = {
  search: "",
  paymentStatus: "",
  datePreset: "",
  startDate: "",
  endDate: "",
  minAmount: "",
  maxAmount: "",
  mode: "",
  createdByRole: "",
  recordStatus: "ACTIVE"
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

const paymentRef = (payment: Payment) => `PAY-${String(payment.id).padStart(6, "0")}`;

const buildGrandTotal = (rows: Payment[]) => ({
  paymentRef: "Grand Total",
  customerName: "",
  customerMobile: "",
  invoiceNo: "",
  paymentDate: "",
  mode: "",
  status: "",
  amount: rows.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
  createdBy: "",
  __rowType: "grandTotal"
});

export const PaymentListPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentPage, setPaymentPage] = useState<PageResponse<Payment>>(emptyPaymentPage);
  const [page, setPage] = useState(0);
  const [draftFilters, setDraftFilters] = useState<PaymentFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<PaymentFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportRows, setExportRows] = useState<Payment[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [logTarget, setLogTarget] = useState<Payment | null>(null);
  const [reminderTarget, setReminderTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [activeSummary, setActiveSummary] = useState<SummaryKey | null>(null);
  const [modalPage, setModalPage] = useState(0);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPayments, setModalPayments] = useState<Payment[]>([]);
  const [modalPaymentPage, setModalPaymentPage] = useState<PageResponse<Payment>>(emptyPaymentPage);
  const [logCounts, setLogCounts] = useState<Record<number, number>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeMaster[]>([]);
  const [reminderForm, setReminderForm] = useState({
    channel: "SMS" as "EMAIL" | "SMS" | "WHATSAPP",
    subject: "Payment Reminder",
    message: ""
  });
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const baseParams = useMemo(() => buildParams(appliedFilters), [appliedFilters]);
  const modeLabelMap = useMemo(() => Object.fromEntries(paymentModes.map((mode) => [mode.modeCode, mode.modeName])), [paymentModes]);
  const activeFilterSummary = useMemo(() => summarizePaymentFilters(appliedFilters, modeLabelMap), [appliedFilters, modeLabelMap]);
  const summary = useMemo(() => ({
    total: exportRows.length,
    collection: exportRows.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    byMode: exportRows.reduce<Record<string, number>>((totals, item) => {
      totals[item.mode] = (totals[item.mode] ?? 0) + Number(item.amount ?? 0);
      return totals;
    }, {}),
    outstandingCollection: exportRows.filter((item) => item.invoiceNo).reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
  }), [exportRows]);
  const modalGrandTotal = useMemo(() => modalPayments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0), [modalPayments]);
  const paymentColumns = useMemo(() => basePaymentColumns(), []);
  const visiblePaymentColumns = useMemo(() => applyVisibleColumns(paymentColumns, visibleColumns), [paymentColumns, visibleColumns]);
  const visiblePaymentExportColumns = useMemo(() => applyVisibleColumns(paymentExportColumns, visibleColumns), [visibleColumns]);

  const loadPayments = async (nextPage = page, params = baseParams) => {
    const response = await getPaymentsPage({ ...params, page: nextPage, size: DEFAULT_PAGE_SIZE });
    setPaymentPage(response);
    setPayments(response.records);
  };

  const loadExportRows = async (params = baseParams) => {
    const response = await getPaymentsPage({ ...params, page: 0, size: 1000 });
    setExportRows(response.records);
  };

  useEffect(() => {
    void Promise.all([loadPayments(0), loadExportRows()]).catch((err: any) => setApiError(err, "Unable to load payments"));
  }, [baseParams]);

  useEffect(() => {
    void getPaymentModes({ active: true, size: 1000 }).then(setPaymentModes).catch((err: any) => setApiError(err, "Unable to load payment modes"));
  }, [setApiError]);

  useEffect(() => {
    const ids = [...new Set([...payments, ...modalPayments].map((payment) => payment.id))];
    if (!can("PAYMENTS", "LOGS") || !ids.length) {
      setLogCounts({});
      return;
    }
    void loadLogCounts("Payment", ids).then(setLogCounts).catch(() => setLogCounts({}));
  }, [can, payments, modalPayments]);

  useEffect(() => {
    if (!activeSummary) return;
    const params = summaryParams(baseParams, activeSummary, modalSearch);
    void getPaymentsPage({ ...params, page: modalPage, size: DEFAULT_PAGE_SIZE })
      .then((response) => {
        setModalPaymentPage(response);
        setModalPayments(response.records);
      })
      .catch((err: any) => setApiError(err, "Unable to load payment details"));
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
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deletePayment(deleteTarget.id);
      await loadPayments(page);
      await loadExportRows();
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Payment"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (payment: Payment) => {
    try {
      setRestoringId(payment.id);
      await restorePayment(payment.id);
      await loadPayments(page);
      await loadExportRows();
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Payment"));
    } catch (err: any) {
      setApiError(err, "Unable to restore payment");
    } finally {
      setRestoringId(null);
    }
  };

  const exportPayments = (fileName: string, rows: Payment[]) => {
    exportToExcel(fileName, rows.length ? [...rows, buildGrandTotal(rows)] : [], visiblePaymentExportColumns);
  };

  const openReminder = (payment: Payment) => {
    setReminderTarget(payment);
    setReminderForm({
      channel: payment.customerEmail ? "EMAIL" : payment.customerMobile ? "SMS" : "WHATSAPP",
      subject: `Payment Reminder - ${payment.invoiceNo ?? paymentRef(payment)}`,
      message: buildPaymentReminderMessage(payment)
    });
  };

  const sendReminder = async () => {
    if (!reminderTarget) {
      return;
    }
    try {
      setSendingReminder(true);
      if (reminderForm.channel === "EMAIL") {
        if (!reminderTarget.customerEmail) {
          throw new Error("Customer email is not available");
        }
        await sendEmailNotification({
          toEmails: [reminderTarget.customerEmail],
          subject: reminderForm.subject,
          message: reminderForm.message
        });
      } else if (reminderForm.channel === "SMS") {
        if (!reminderTarget.customerMobile) {
          throw new Error("Customer mobile number is not available");
        }
        await sendSmsNotification({
          mobileNumbers: [reminderTarget.customerMobile],
          message: reminderForm.message
        });
      } else {
        if (!reminderTarget.customerMobile) {
          throw new Error("Customer mobile number is not available");
        }
        await sendWhatsAppNotification({
          mobileNumbers: [reminderTarget.customerMobile],
          message: reminderForm.message
        });
      }
      notificationService.showSuccess("Reminder sent successfully.");
      setReminderTarget(null);
    } catch (err: any) {
      setApiError(err, "Unable to send payment reminder");
    } finally {
      setSendingReminder(false);
    }
  };

  const openSummary = (key: SummaryKey) => {
    setActiveSummary(key);
    setModalPage(0);
    setModalSearch("");
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Payments" subtitle="Review customer collections and invoice-linked payment activity." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Payments" value={String(summary.total)} caption="Current filtered payments" icon={<CreditCard size={18} />} onClick={() => openSummary("total")} />
        <StatCard label="Total Collection" value={formatCurrency(summary.collection)} caption="All payment modes" icon={<Wallet size={18} />} onClick={() => openSummary("collection")} />
        {paymentModes.slice(0, 2).map((mode) => (
          <StatCard key={mode.modeCode} label={`${mode.modeName} Collection`} value={formatCurrency(summary.byMode[mode.modeCode] ?? 0)} caption={`${mode.modeName} payments`} icon={<CreditCard size={18} />} onClick={() => openSummary(`mode:${mode.modeCode}`)} />
        ))}
        <StatCard label="Outstanding Collection" value={formatCurrency(summary.outstandingCollection)} caption="Invoice-linked payments" icon={<AlertCircle size={18} />} onClick={() => openSummary("outstanding")} />
      </div>

      <CommonAdvancedFilterPanel
        title="Advanced Payment Search"
        eyebrow="Payment Filters"
        expanded={filtersOpen}
        activeFilters={activeFilterSummary}
        onToggle={() => setFiltersOpen((current) => !current)}
        onClearAll={resetFilters}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Search Payment" placeholder="Search by payment ref no, invoice no, customer name or mobile number" value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} onClear={clearSearchFilter} />
          <Select label="Payment Status" value={draftFilters.paymentStatus} options={[
            { label: "All", value: "" },
            { label: "Success", value: "SUCCESS" },
            { label: "Pending", value: "PENDING" },
            { label: "Failed", value: "FAILED" },
            { label: "Cancelled", value: "CANCELLED" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, paymentStatus: event.target.value }))} />
          <Select label="Payment Method" value={draftFilters.mode} options={[
            { label: "All", value: "" },
            ...paymentModes.map((mode) => ({ label: mode.modeName, value: mode.modeCode }))
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, mode: event.target.value }))} />
          <Select label="Payment Date" value={draftFilters.datePreset} options={[
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
          <Input label="Min Amount" placeholder="Enter minimum amount" type="number" value={draftFilters.minAmount} onChange={(event) => setDraftFilters((current) => ({ ...current, minAmount: event.target.value }))} />
          <Input label="Max Amount" placeholder="Enter maximum amount" type="number" value={draftFilters.maxAmount} onChange={(event) => setDraftFilters((current) => ({ ...current, maxAmount: event.target.value }))} />
          <Select label="Created By" value={draftFilters.createdByRole} options={[
            { label: "All Users", value: "" },
            { label: "Owner", value: "OWNER" },
            { label: "Admin", value: "ADMIN" },
            { label: "User", value: "USER" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, createdByRole: event.target.value }))} />
          <Select label="Record Status" value={draftFilters.recordStatus} options={[
            { label: "Active", value: "ACTIVE" },
            { label: "Deleted", value: "DELETED" },
            { label: "All", value: "ALL" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, recordStatus: event.target.value as PaymentFilters["recordStatus"] }))} />
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
            <CommonBreadcrumb items={[{ label: "Payments" }]} />
          </div>
          {can("PAYMENTS", "EXPORT") || can("PAYMENTS", "ADD") ? (
            <div className="flex flex-wrap gap-2">
              <CommonColumnSelector tableName="PAYMENTS" availableColumns={paymentColumns.map(({ key, header }) => ({ key, header }))} visibleColumns={visibleColumns} onApply={setVisibleColumns} />
              {can("PAYMENTS", "EXPORT") ? (
                <Button type="button" variant="secondary" disabled={!exportRows.length} onClick={() => exportPayments("payments.xlsx", exportRows)}>
                  <Download size={16} />
                  Export Excel
                </Button>
              ) : null}
              {can("PAYMENTS", "ADD") ? (
                <Link to="/payments/new">
                  <Button>Add Payment</Button>
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex-1">
          <PaymentTable
            payments={payments}
            columns={visiblePaymentColumns}
            logCounts={logCounts}
            canDelete={can("PAYMENTS", "DELETE")}
            canRestore={can("PAYMENTS", "RESTORE")}
            canViewLogs={can("PAYMENTS", "LOGS")}
            canAdd={can("PAYMENTS", "ADD")}
            canSendEmail={can("EMAIL_TEMPLATES", "EMAIL_SEND")}
            canSendSms={can("SMS_TEMPLATES", "SMS_SEND")}
            canSendWhatsApp={can("COMMUNICATION", "WHATSAPP_SEND")}
            restoringId={restoringId}
            onDelete={setDeleteTarget}
            onRestore={(payment) => void handleRestore(payment)}
            onShowLogs={setLogTarget}
            onSendReminder={openReminder}
          />
        </div>
        <div className="mt-auto">
          <Pagination page={paymentPage.page} size={paymentPage.size} totalRecords={paymentPage.totalRecords} totalPages={paymentPage.totalPages} onPageChange={(nextPage) => {
          setPage(nextPage);
          void loadPayments(nextPage);
          }} />
        </div>
      </GlassCard>

      <Modal open={Boolean(activeSummary)} title={summaryTitle(activeSummary)} onClose={() => setActiveSummary(null)}>
        <div className="space-y-5">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-950">Active Filters:</span>
            <span className="min-w-0 flex-1 text-slate-600">
              {[summaryTitle(activeSummary), ...activeFilterSummary].filter(Boolean).join(" | ")}
            </span>
            <span className="font-semibold text-slate-950">Records: {modalPaymentPage.totalRecords}</span>
            <span className="font-semibold text-slate-950">Grand Total: {formatCurrency(modalGrandTotal)}</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input label="Search Modal Payments" placeholder="Search by payment ref no, invoice no, customer name or mobile number" value={modalSearch} onChange={(event) => {
              setModalPage(0);
              setModalSearch(event.target.value);
            }} />
            <Button type="button" variant="secondary" disabled={!modalPayments.length} onClick={() => exportPayments(`${activeSummary ?? "payment"}-details.xlsx`, modalPayments)}>
              <Download size={17} />
              Export Excel
            </Button>
          </div>
          <PaymentTable
            payments={modalPayments}
            columns={visiblePaymentColumns}
            logCounts={logCounts}
            canDelete={false}
            canRestore={can("PAYMENTS", "RESTORE")}
            canViewLogs={can("PAYMENTS", "LOGS")}
            canSendEmail={can("EMAIL_TEMPLATES", "EMAIL_SEND")}
            canSendSms={can("SMS_TEMPLATES", "SMS_SEND")}
            canSendWhatsApp={can("COMMUNICATION", "WHATSAPP_SEND")}
            restoringId={restoringId}
            onDelete={setDeleteTarget}
            onRestore={(payment) => void handleRestore(payment)}
            onShowLogs={setLogTarget}
            onSendReminder={openReminder}
          />
          <Pagination page={modalPaymentPage.page} size={modalPaymentPage.size} totalRecords={modalPaymentPage.totalRecords} totalPages={modalPaymentPage.totalPages} onPageChange={setModalPage} />
        </div>
      </Modal>

      <Modal open={Boolean(reminderTarget)} title="Send Reminder" onClose={() => setReminderTarget(null)}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">{reminderTarget?.customerName ?? "--"}</p>
            <p>{reminderTarget?.customerEmail ?? reminderTarget?.customerMobile ?? "--"}</p>
            <p className="mt-2">Reference: {reminderTarget ? reminderTarget.invoiceNo ?? paymentRef(reminderTarget) : "--"}</p>
          </div>
          <Select
            label="Reminder Channel"
            value={reminderForm.channel}
            options={[
              { label: "Email", value: "EMAIL" },
              { label: "SMS", value: "SMS" },
              { label: "WhatsApp", value: "WHATSAPP" }
            ]}
            onChange={(event) => setReminderForm((current) => ({ ...current, channel: event.target.value as "EMAIL" | "SMS" | "WHATSAPP" }))}
          />
          {reminderForm.channel === "EMAIL" ? (
            <Input label="Subject" value={reminderForm.subject} onChange={(event) => setReminderForm((current) => ({ ...current, subject: event.target.value }))} />
          ) : null}
          <label className="block space-y-2">
            <span className="block text-sm font-semibold text-slate-700">Message</span>
            <textarea className="min-h-[144px] w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]" value={reminderForm.message} onChange={(event) => setReminderForm((current) => ({ ...current, message: event.target.value }))} />
          </label>
          {reminderForm.channel === "EMAIL" && !reminderTarget?.customerEmail ? (
            <p className="text-sm text-rose-700">Customer email missing.</p>
          ) : null}
          {(reminderForm.channel === "SMS" || reminderForm.channel === "WHATSAPP") && !reminderTarget?.customerMobile ? (
            <p className="text-sm text-rose-700">Customer mobile number missing.</p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setReminderTarget(null)}>Cancel</Button>
            <Button
              type="button"
              disabled={
                sendingReminder
                || !reminderForm.message.trim()
                || (reminderForm.channel === "EMAIL" && (!reminderForm.subject.trim() || !reminderTarget?.customerEmail))
                || ((reminderForm.channel === "SMS" || reminderForm.channel === "WHATSAPP") && !reminderTarget?.customerMobile)
              }
              onClick={() => void sendReminder()}
            >
              {sendingReminder ? "Sending..." : "Send Reminder"}
            </Button>
          </div>
        </div>
      </Modal>

      <AuditLogModal open={Boolean(logTarget)} moduleName="Payment" entityId={logTarget?.id ?? null} title={logTarget ? `${paymentRef(logTarget)} Logs` : "Payment Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
    </div>
  );
};

const PaymentTable = ({
  payments,
  columns,
  logCounts,
  canDelete,
  canRestore,
  canViewLogs = false,
  canAdd = false,
  canSendEmail = false,
  canSendSms = false,
  canSendWhatsApp = false,
  restoringId = null,
  onDelete,
  onRestore,
  onShowLogs,
  onSendReminder
}: {
  payments: Payment[];
  columns: ReturnType<typeof basePaymentColumns>;
  logCounts: Record<number, number>;
  canDelete: boolean;
  canRestore: boolean;
  canViewLogs?: boolean;
  canAdd?: boolean;
  canSendEmail?: boolean;
  canSendSms?: boolean;
  canSendWhatsApp?: boolean;
  restoringId?: number | null;
  onDelete: (payment: Payment) => void;
  onRestore: (payment: Payment) => void;
  onShowLogs?: (payment: Payment) => void;
  onSendReminder?: (payment: Payment) => void;
}) => (
  <Table
    data={payments}
    emptyText="No payments match the selected filters."
    emptyAction={canAdd ? <Link to="/payments/new"><Button>Add Payment</Button></Link> : null}
    columns={[
      ...columns,
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        render: (item) => (
          <ActionDropdown actions={[
            {
              label: "Send Reminder",
              icon: <Send size={15} />,
              hidden: item.deleted || !(canSendEmail || canSendSms || canSendWhatsApp) || (!item.customerEmail && !item.customerMobile),
              onClick: () => onSendReminder?.(item)
            },
            { label: "Show Logs", icon: <History size={15} />, hidden: !canViewLogs || !logCounts[item.id], onClick: () => onShowLogs?.(item) },
            { label: restoringId === item.id ? "Restoring..." : "Restore", icon: <RotateCcw size={15} />, hidden: !item.deleted || !canRestore, onClick: () => onRestore(item) },
            { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: item.deleted || !canDelete, onClick: () => onDelete(item) }
          ]} />
        )
      }
    ]}
  />
);

const basePaymentColumns = () => [
  { key: "ref", header: "Payment Ref", render: (item: Payment) => <span className="font-semibold text-white">{paymentRef(item)}</span> },
  {
    key: "customer",
    header: "Customer",
    render: (item: Payment) => (
      <div>
        <p className="font-semibold text-white">{item.customerName}</p>
        <p className="text-xs text-slate-400">{item.customerMobile ?? "--"}</p>
      </div>
    )
  },
  { key: "invoice", header: "Invoice Number", render: (item: Payment) => item.invoiceNo ?? "Unapplied" },
  { key: "date", header: "Payment Date", render: (item: Payment) => formatDate(item.paymentDate) },
  { key: "mode", header: "Method", render: (item: Payment) => item.mode.replace(/_/g, " ") },
  { key: "status", header: "Status", render: (item: Payment) => <div className="flex flex-wrap gap-2"><StatusBadge label="SUCCESS" />{item.deleted ? <StatusBadge label="Deleted" /> : null}</div> },
  { key: "createdBy", header: "Created By", render: (item: Payment) => item.createdBy ?? "--" },
  { key: "amount", header: "Amount", className: "text-right", render: (item: Payment) => <span className="block text-right font-semibold text-white">{formatCurrency(item.amount)}</span> }
];

const loadLogCounts = async (moduleName: string, ids: number[]) => {
  const entries = await Promise.all(ids.map(async (entityId) => {
    const response = await getAuditLogs({ moduleName, entityId, page: 0, size: 1 });
    return [entityId, response.totalRecords] as const;
  }));
  return Object.fromEntries(entries);
};

const buildParams = (filters: PaymentFilters): PaymentFilterParams => {
  const presetRange = filters.datePreset === "custom" ? { startDate: filters.startDate, endDate: filters.endDate } : dateRangeForPreset(filters.datePreset);
  return {
    search: filters.search.trim() || undefined,
    paymentStatus: filters.paymentStatus || undefined,
    startDate: presetRange.startDate || undefined,
    endDate: presetRange.endDate || undefined,
    minAmount: filters.minAmount || undefined,
    maxAmount: filters.maxAmount || undefined,
    mode: filters.mode || undefined,
    createdByRole: filters.createdByRole || undefined,
    recordStatus: filters.recordStatus
  };
};

const summarizePaymentFilters = (filters: PaymentFilters, methodLabels: Record<string, string>) => {
  const summary: string[] = [];
  const paymentStatusLabels: Record<string, string> = {
    SUCCESS: "Success",
    PENDING: "Pending",
    FAILED: "Failed",
    CANCELLED: "Cancelled"
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
  const roleLabels: Record<string, string> = {
    OWNER: "Owner",
    ADMIN: "Admin",
    USER: "User"
  };
  const recordStatusLabels: Record<PaymentFilters["recordStatus"], string> = {
    ACTIVE: "Active Records",
    DELETED: "Deleted Records",
    ALL: "All Records"
  };

  if (filters.search.trim()) summary.push(`Search: ${filters.search.trim()}`);
  if (filters.paymentStatus) summary.push(paymentStatusLabels[filters.paymentStatus] ?? filters.paymentStatus);
  if (filters.mode) summary.push(methodLabels[filters.mode] ?? filters.mode);
  if (filters.datePreset === "custom" && (filters.startDate || filters.endDate)) {
    summary.push(`${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`);
  } else if (filters.datePreset) {
    summary.push(datePresetLabels[filters.datePreset]);
  }
  if (filters.minAmount) summary.push(`Amount > ${filters.minAmount}`);
  if (filters.maxAmount) summary.push(`Amount < ${filters.maxAmount}`);
  if (filters.createdByRole) summary.push(`Created By: ${roleLabels[filters.createdByRole] ?? filters.createdByRole}`);
  if (filters.recordStatus !== "ACTIVE") summary.push(recordStatusLabels[filters.recordStatus]);
  return summary;
};

const summaryParams = (params: PaymentFilterParams, key: SummaryKey, search: string): PaymentFilterParams => {
  const next: PaymentFilterParams = { ...params, search: search.trim() || params.search };
  if (key.startsWith("mode:")) next.mode = key.slice("mode:".length);
  if (key === "outstanding") next.invoiceLinked = true;
  return next;
};

const summaryTitle = (key: SummaryKey | null) => {
  if (key === "collection") return "Total Collection Details";
  if (key?.startsWith("mode:")) return `${key.slice("mode:".length).replace(/_/g, " ")} Collection Details`;
  if (key === "outstanding") return "Outstanding Collection Details";
  return "Payment Details";
};

const paymentExportColumns = [
  { key: "paymentRef", header: "Payment Reference No", value: (row: Payment | Record<string, unknown>) => String((row as Record<string, unknown>).paymentRef ?? ("id" in row ? paymentRef(row as Payment) : "")) },
  { key: "invoiceNo", header: "Invoice Number" },
  { key: "customerName", header: "Customer Name" },
  { key: "customerMobile", header: "Mobile Number" },
  { key: "paymentDate", header: "Payment Date", type: "date" as const },
  { key: "mode", header: "Method" },
  { key: "status", header: "Status", value: (row: Payment | Record<string, unknown>) => String((row as Record<string, unknown>).status ?? "Success") },
  { key: "deleted", header: "Record Status", value: (row: Payment | Record<string, unknown>) => (row as Payment).deleted ? "Deleted" : "Active" },
  { key: "amount", header: "Amount", type: "amount" as const },
  { key: "createdBy", header: "Created By" }
];

const buildPaymentReminderMessage = (payment: Payment) =>
  `Hello ${payment.customerName}, this is a reminder for ${payment.invoiceNo ?? paymentRef(payment)}. We have received a payment of Rs. ${Number(payment.amount).toFixed(2)} on ${formatDate(payment.paymentDate)}. If any balance is still pending, please clear it at the earliest.`;

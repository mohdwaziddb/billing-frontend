import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CreditCard, Download, History, RotateCcw, Send, Wallet } from "lucide-react";
import { sendEmailNotification, sendSmsNotification, sendWhatsAppNotification } from "../api/notifications";
import { getPaymentModes } from "../api/paymentModes";
import { deletePayment, getPaymentLogCounts, getPaymentsPage, getPaymentsSummary, restorePayment, type PaymentFilterParams, type PaymentSummary } from "../api/payments";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { DataPortLink } from "../components/DataPortLink";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
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
import { usePaymentGatewayConfig } from "../modules/payments/hooks/usePaymentGatewayConfig";
import { paymentModeDisplay, paymentModeLabel } from "../modules/payments/paymentModeOptions";
import { notificationService } from "../services/notificationService";
import type { NotificationLog, PageResponse, Payment, PaymentModeMaster } from "../types/api";

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

const emptyPaymentSummary: PaymentSummary = { totalRecords: 0, totalAmount: 0, byMode: {} };

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
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>(emptyPaymentSummary);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Payment | null>(null);
  const [logTarget, setLogTarget] = useState<Payment | null>(null);
  const [reminderTarget, setReminderTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [activeSummary, setActiveSummary] = useState<SummaryKey | null>(null);
  const [modalPage, setModalPage] = useState(0);
  const [modalSearch, setModalSearch] = useState("");
  // Modal search har keystroke par API na maare — thoda ruk kar (debounce).
  const [debouncedModalSearch, setDebouncedModalSearch] = useState("");
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
  const { config: gatewayConfig } = usePaymentGatewayConfig();

  const list = useListPage<Payment, PaymentFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load payments",
    fetchPage: ({ page, size, filters }) => getPaymentsPage({ ...buildParams(filters), page, size })
  });

  // KPI cards: backend aggregate (count + sum, mode-wise). Pehle page load par hi saare pages
  // (1000 x 50 tak) laaye jaate the sirf cards ke totals ke liye — page bahut der se khulta tha.
  const summaryRequestId = useRef(0);
  const loadSummary = async (filters: PaymentFilters) => {
    const requestId = ++summaryRequestId.current;
    const nextSummary = await getPaymentsSummary(buildParams(filters));
    if (requestId === summaryRequestId.current) {
      setPaymentSummary(nextSummary);
    }
  };

  useEffect(() => {
    void loadSummary(list.activeFilters).catch((err: any) => setApiError(err, "Unable to load payments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.activeFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedModalSearch(modalSearch), 300);
    return () => window.clearTimeout(timer);
  }, [modalSearch]);

  useEffect(() => {
    void getPaymentModes({ active: true, size: 1000 }).then(setPaymentModes).catch((err: any) => setApiError(err, "Unable to load payment modes"));
  }, [setApiError]);

  const baseParams = useMemo(() => buildParams(list.activeFilters), [list.activeFilters]);
  const modeLabelMap = useMemo(() => Object.fromEntries(paymentModes.map((mode) => [mode.modeCode, mode.modeName])), [paymentModes]);
  const activeFilterSummary = useMemo(() => summarizePaymentFilters(list.activeFilters, modeLabelMap), [list.activeFilters, modeLabelMap]);
  const summary = useMemo(() => ({
    total: Number(paymentSummary.totalRecords ?? 0),
    collection: Number(paymentSummary.totalAmount ?? 0),
    byMode: Object.fromEntries(Object.entries(paymentSummary.byMode ?? {}).map(([modeCode, amount]) => [modeCode, Number(amount ?? 0)])) as Record<string, number>,
  }), [paymentSummary]);
  // Active modes ke cards + baaki sab (purane / band modes jaise UPI, Card) ek "Other modes" card me —
  // taaki cards ka jod hamesha Total Collection ke barabar rahe (pehle UPI ki payment kahin nahi dikhti thi).
  const modeCards = useMemo(() => paymentModes.slice(0, 2), [paymentModes]);
  const otherModes = useMemo(() => {
    const shown = new Set(modeCards.map((mode) => mode.modeCode));
    return Object.entries(summary.byMode)
      .filter(([code, amount]) => !shown.has(code) && amount > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [modeCards, summary.byMode]);
  const otherModesTotal = otherModes.reduce((sum, [, amount]) => sum + amount, 0);
  const modalGrandTotal = useMemo(() => modalPayments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0), [modalPayments]);
  const paymentColumns = useMemo(() => basePaymentColumns(), []);
  const visiblePaymentColumns = useMemo(() => applyVisibleColumns(paymentColumns, visibleColumns), [paymentColumns, visibleColumns]);
  const visiblePaymentExportColumns = useMemo(() => applyVisibleColumns(paymentExportColumns, visibleColumns), [visibleColumns]);

  useEffect(() => {
    const ids = [...new Set([...list.tableData, ...modalPayments].map((payment) => payment.id))];
    if (!can("PAYMENTS", "LOGS") || !ids.length) {
      setLogCounts({});
      return;
    }
    void loadLogCounts(ids).then(setLogCounts).catch(() => setLogCounts({}));
  }, [can, list.tableData, modalPayments]);

  useEffect(() => {
    if (!activeSummary) return;
    const params = summaryParams(baseParams, activeSummary, debouncedModalSearch);
    let cancelled = false;
    void getPaymentsPage({ ...params, page: modalPage, size: DEFAULT_PAGE_SIZE })
      .then((response) => {
        if (cancelled) {
          return;
        }
        setModalPaymentPage(response);
        setModalPayments(response.records);
      })
      .catch((err: any) => {
        if (!cancelled) {
          setApiError(err, "Unable to load payment details");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeSummary, baseParams, modalPage, debouncedModalSearch, setApiError]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deletePayment(deleteTarget.id);
      list.refreshTable();
      await loadSummary(list.activeFilters);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Payment"));
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
      await restorePayment(restoreTarget.id);
      setRestoreTarget(null);
      list.refreshTable();
      await loadSummary(list.activeFilters);
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

  // Export ke liye hi saare pages laao (sirf button click par, page load par nahi).
  const exportAllPayments = async () => {
    try {
      setExporting(true);
      const filters = list.activeFilters;
      const rows = await fetchAllPages((page, size) => getPaymentsPage({ ...buildParams(filters), page, size }));
      exportPayments("payments.xlsx", rows);
    } catch (err: any) {
      setApiError(err, "Unable to export payments");
    } finally {
      setExporting(false);
    }
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
      let sentLogs: NotificationLog[] = [];
      if (reminderForm.channel === "EMAIL") {
        if (!reminderTarget.customerEmail) {
          throw new Error("Customer email is not available");
        }
        sentLogs = await sendEmailNotification({
          toEmails: [reminderTarget.customerEmail],
          subject: reminderForm.subject,
          message: reminderForm.message
        });
      } else if (reminderForm.channel === "SMS") {
        if (!reminderTarget.customerMobile) {
          throw new Error("Customer mobile number is not available");
        }
        sentLogs = await sendSmsNotification({
          mobileNumbers: [reminderTarget.customerMobile],
          message: reminderForm.message
        });
      } else {
        if (!reminderTarget.customerMobile) {
          throw new Error("Customer mobile number is not available");
        }
        sentLogs = await sendWhatsAppNotification({
          mobileNumbers: [reminderTarget.customerMobile],
          message: reminderForm.message
        });
      }
      // PENDING/FAILED (e.g. provider not configured) must not show as
      // success — surface the backend provider message instead.
      if (!sentLogs.length || sentLogs.every((log) => log.status !== "SENT")) {
        throw new Error(sentLogs[0]?.providerResponse ?? "Reminder could not be sent.");
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
    setDebouncedModalSearch("");
  };

  const buildTableColumns = (canDelete: boolean): Column<Payment>[] => [
    ...visiblePaymentColumns,
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        <ActionDropdown actions={[
          {
            label: "Send Reminder",
            icon: <Send size={15} />,
            hidden: item.deleted || !(can("EMAIL_TEMPLATES", "EMAIL_SEND") || can("SMS_TEMPLATES", "SMS_SEND") || can("COMMUNICATION", "WHATSAPP_SEND")) || (!item.customerEmail && !item.customerMobile),
            onClick: () => openReminder(item)
          },
          { label: "Show Logs", icon: <History size={15} />, hidden: !can("PAYMENTS", "LOGS") || !logCounts[item.id], onClick: () => setLogTarget(item) },
          { label: restoringId === item.id ? "Restoring..." : "Restore", icon: <RotateCcw size={15} />, hidden: !item.deleted || !can("PAYMENTS", "RESTORE"), onClick: () => setRestoreTarget(item) },
          { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: item.deleted || !canDelete, onClick: () => setDeleteTarget(item) }
        ]} />
      )
    }
  ];

  return (
    <CommonListPage<Payment, PaymentFilters>
      pageTitle="Payments"
      pageSubtitle="Review customer collections and invoice-linked payment activity."
      list={list}
      searchPlaceholder="Search Payment"
      activeFilterCount={() => activeFilterSummary.length}
      filterPanelWidth="max-w-[720px]"
      filtersClassName="grid gap-3 md:grid-cols-2"
      statCards={
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Payments" value={String(summary.total)} caption="Current filtered payments" icon={<CreditCard size={18} />} onClick={() => openSummary("total")} />
          <StatCard label="Total Collection" value={formatCurrency(summary.collection)} caption="All payment modes" icon={<Wallet size={18} />} onClick={() => openSummary("collection")} />
          {modeCards.map((mode) => {
            const label = paymentModeLabel(mode, gatewayConfig?.gatewayName);
            return (
              <StatCard key={mode.modeCode} label={`${label} Collection`} value={formatCurrency(summary.byMode[mode.modeCode] ?? 0)} caption={`${label} payments`} icon={<CreditCard size={18} />} onClick={() => openSummary(`mode:${mode.modeCode}`)} />
            );
          })}
          <StatCard
            label="Other Modes"
            value={formatCurrency(otherModesTotal)}
            caption={otherModes.length ? otherModes.map(([code, amount]) => `${code.replace(/_/g, " ")} ${formatCurrency(amount)}`).join(" · ") : "Older modes (UPI, Card…)"}
            icon={<AlertCircle size={18} />}
            onClick={otherModes.length === 1 ? () => openSummary(`mode:${otherModes[0][0]}`) : undefined}
          />
        </div>
      }
      filterFields={
        <>
          <Select label="Payment Status" value={list.formFilters.paymentStatus} options={[
            { label: "All", value: "" },
            { label: "Success", value: "SUCCESS" },
            { label: "Pending", value: "PENDING" },
            { label: "Failed", value: "FAILED" },
            { label: "Cancelled", value: "CANCELLED" }
          ]} onChange={(event) => list.updateFormFilters({ paymentStatus: event.target.value })} />
          <Select label="Payment Method" value={list.formFilters.mode} options={[
            { label: "All", value: "" },
            ...paymentModes.map((mode) => ({ label: mode.modeName, value: mode.modeCode }))
          ]} onChange={(event) => list.updateFormFilters({ mode: event.target.value })} />
          <Select label="Payment Date" value={list.formFilters.datePreset} options={[
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
          <Input label="Min Amount" placeholder="Enter minimum amount" type="number" value={list.formFilters.minAmount} onChange={(event) => list.updateFormFilters({ minAmount: event.target.value })} />
          <Input label="Max Amount" placeholder="Enter maximum amount" type="number" value={list.formFilters.maxAmount} onChange={(event) => list.updateFormFilters({ maxAmount: event.target.value })} />
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
          ]} onChange={(event) => list.updateFormFilters({ recordStatus: event.target.value as PaymentFilters["recordStatus"] })} />
        </>
      }
      toolbarButtons={
        can("PAYMENTS", "EXPORT") || can("PAYMENTS", "ADD") || can("PAYMENT_DATAPORT", "VIEW") ? (
          <>
            {can("PAYMENTS", "EXPORT") ? (
              <Button type="button" variant="secondary" disabled={!summary.total || exporting} onClick={() => void exportAllPayments()}>
                <Download size={16} />
                {exporting ? "Exporting..." : "Export Excel"}
              </Button>
            ) : null}
            <DataPortLink menuCode="PAYMENT_DATAPORT" moduleKey="payments" />
            {can("PAYMENTS", "ADD") ? (
              <Link to="/payments/new">
                <Button>Add Payment</Button>
              </Link>
            ) : null}
          </>
        ) : null
      }
      columnSelector={{ tableName: "PAYMENTS", columns: paymentColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["ref"] }}
      tableColumns={buildTableColumns(can("PAYMENTS", "DELETE"))}
      emptyMessage="No payments match the selected filters."
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
                <span className="font-semibold text-slate-950">Records: {modalPaymentPage.totalRecords}</span>
                <span className="font-semibold text-slate-950">Grand Total: {formatCurrency(modalGrandTotal)}</span>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Input label="Search Modal Payments" placeholder="Search by payment ref no, invoice no, customer name or mobile number" value={modalSearch} onChange={(event) => {
                  setModalPage(0);
                  setModalSearch(event.target.value);
                }} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="button" variant="secondary" disabled={!modalPayments.length} onClick={() => exportPayments(`${activeSummary ?? "payment"}-details.xlsx`, modalPayments)}>
                  <Download size={17} />
                  Export Excel
                </Button>
                <div className="flex justify-end"><Pagination
                  page={modalPaymentPage.page}
                  size={modalPaymentPage.size}
                  totalRecords={modalPaymentPage.totalRecords}
                  totalPages={modalPaymentPage.totalPages}
                  onPageChange={setModalPage}
                layout="inline" /></div>
              </div>
              </div>
              <Table
                data={modalPayments}
                emptyText="No payments match the selected filters."
                columns={buildTableColumns(false)}
              />
            </div>
          </Modal>

          <Modal open={Boolean(restoreTarget)} title="Restore Payment" onClose={() => restoringId === null && setRestoreTarget(null)}>
            <p className="text-sm leading-6 text-slate-600">
              Restore this payment? It will become active again and re-apply to its invoice.
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

          <Modal open={Boolean(reminderTarget)} title="Send Reminder" onClose={() => setReminderTarget(null)}>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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
        </>
      }
    />
  );
};

const basePaymentColumns = () => [
  { key: "ref", header: "Payment Ref", render: (item: Payment) => <span className="font-semibold text-white">{paymentRef(item)}</span> },
  {
    key: "customer",
    header: "Customer",
    render: (item: Payment) => (
      <div className="whitespace-nowrap">
        <p className="font-semibold text-white">{item.customerName}</p>
        <p className="text-xs text-slate-400">{item.customerMobile ?? "--"}</p>
      </div>
    )
  },
  { key: "invoice", header: "Invoice Number", render: (item: Payment) => item.invoiceNo ?? "Unapplied" },
  { key: "date", header: "Payment Date", render: (item: Payment) => <span className="whitespace-nowrap">{formatDate(item.paymentDate)}</span> },
  { key: "mode", header: "Method", render: (item: Payment) => (
    item.source === "GATEWAY"
      ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 fs-11 font-semibold text-emerald-700">{paymentModeDisplay(item)}</span>
      : paymentModeDisplay(item)
  ) },
  { key: "referenceNo", header: "Reference", render: (item: Payment) => <span className="break-all text-xs">{item.referenceNo ?? "--"}</span> },
  { key: "status", header: "Status", render: (item: Payment) => <div className="flex flex-wrap gap-2"><StatusBadge label="SUCCESS" />{item.deleted ? <StatusBadge label="Deleted" /> : null}</div> },
  { key: "createdBy", header: "Created By", render: (item: Payment) => item.createdBy ?? "--" },
  { key: "amount", header: "Amount", className: "text-right", render: (item: Payment) => <span className="block text-right font-semibold text-white">{formatCurrency(item.amount)}</span> }
];

// Saari visible rows ka log count ek hi call me (pehle har row ki alag /audit-logs call).
const loadLogCounts = async (ids: number[]): Promise<Record<number, number>> => {
  const counts = await getPaymentLogCounts(ids);
  return Object.fromEntries(Object.entries(counts ?? {}).map(([entityId, count]) => [Number(entityId), Number(count ?? 0)]));
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
  { key: "referenceNo", header: "Reference" },
  { key: "status", header: "Status", value: (row: Payment | Record<string, unknown>) => String((row as Record<string, unknown>).status ?? "Success") },
  { key: "deleted", header: "Record Status", value: (row: Payment | Record<string, unknown>) => (row as Payment).deleted ? "Deleted" : "Active" },
  { key: "amount", header: "Amount", type: "amount" as const },
  { key: "createdBy", header: "Created By" }
];

const buildPaymentReminderMessage = (payment: Payment) =>
  `Hello ${payment.customerName}, this is a reminder for ${payment.invoiceNo ?? paymentRef(payment)}. We have received a payment of Rs. ${Number(payment.amount).toFixed(2)} on ${formatDate(payment.paymentDate)}. If any balance is still pending, please clear it at the earliest.`;

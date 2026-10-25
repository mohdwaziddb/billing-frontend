import { useEffect, useMemo, useState } from "react";
import { BellRing, History } from "lucide-react";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { useListPage } from "../../../hooks/useListPage";
import { formatCurrency } from "../../../lib/currency";
import { formatDate, formatDateTime, localIsoDate } from "../../../lib/format";
import { Button } from "../../../components/Button";
import { ActionDropdown } from "../../../components/ActionDropdown";
import { applyVisibleColumns } from "../../../components/CommonColumnSelector";
import { CommonListPage } from "../../../components/CommonListPage";
import { GlassCard } from "../../../components/GlassCard";
import { Input } from "../../../components/Input";
import { Modal } from "../../../components/Modal";
import { Select } from "../../../components/Select";
import { PreviewSurface } from "../../../components/PreviewSurface";
import { sanitizeHtml } from "../../../lib/sanitizeHtml";
import { StatusBadge } from "../../../components/StatusBadge";
import { useAuth } from "../../../context/AuthContext";
import { notificationService } from "../../../services/notificationService";
import { ReminderHistoryModal } from "../components/ReminderHistoryModal";
import { getActiveEmailTemplates, previewEmailTemplate } from "../../../api/emailTemplates";
import { getActiveSmsTemplates, previewSmsTemplate } from "../../../api/smsTemplates";
import { getOverdueCustomers, getOverdueSummary, sendReminder } from "../reminder.api";
import type { OverdueCustomer, OverdueSummary, ReminderChannel } from "../reminder.types";
import type { EmailPreview, EmailTemplate, SmsTemplate } from "../../../types/api";

const channelOptions = [
  { label: "Email", value: "EMAIL" },
  { label: "SMS", value: "SMS" },
  { label: "WhatsApp", value: "WHATSAPP" }
] as const;

// Channel list ka filter nahi tha (backend use hi nahi karta tha); wo sirf Send modal me hai.
type OutstandingFilters = {
  search: string;
  minBalance: string;
  overdueDays: string;
};

const emptyFilters: OutstandingFilters = {
  search: "",
  minBalance: "",
  overdueDays: ""
};

type TemplateChannel = "EMAIL" | "SMS";

const filterParams = (filters: OutstandingFilters) => ({
  search: filters.search || undefined,
  minBalance: filters.minBalance ? Number(filters.minBalance) : undefined,
  overdueDays: filters.overdueDays ? Number(filters.overdueDays) : undefined
});

export const OutstandingCustomersReminderPage = () => {
  const { clearMessage, setApiError } = useApiMessage();
  const { can } = useAuth();
  const [historyTarget, setHistoryTarget] = useState<{ id: number; name: string } | null>(null);
  // Har channel ke templates alag: pehle ek hi list thi, SMS dekhne ke baad EMAIL modal me SMS template id chala jaata tha.
  const [templatesByChannel, setTemplatesByChannel] = useState<Partial<Record<TemplateChannel, Array<EmailTemplate | SmsTemplate>>>>({});
  const [summary, setSummary] = useState<OverdueSummary | null>(null);
  const [summaryVersion, setSummaryVersion] = useState(0);
  const [sending, setSending] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<OverdueCustomer | null>(null);
  const [reminderForm, setReminderForm] = useState<{ channel: ReminderChannel; templateId: string }>({
    channel: "EMAIL",
    templateId: ""
  });
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  const list = useListPage<OverdueCustomer, OutstandingFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load overdue customers",
    fetchPage: ({ page, size, filters }) => getOverdueCustomers({ ...filterParams(filters), page, size })
  });

  // Cards poori list ka total dikhate hain (pehle sirf current page ka jod tha).
  const summaryFilters = JSON.stringify(filterParams(list.activeFilters));
  useEffect(() => {
    let cancelled = false;
    getOverdueSummary(JSON.parse(summaryFilters))
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [summaryFilters, summaryVersion]);

  const canViewTemplates = (channel: ReminderChannel) =>
    channel === "EMAIL" ? can("EMAIL_TEMPLATES", "VIEW") : channel === "SMS" ? can("SMS_TEMPLATES", "VIEW") : true;
  const templates = reminderForm.channel === "EMAIL" || reminderForm.channel === "SMS" ? templatesByChannel[reminderForm.channel] ?? [] : [];

  // Templates sirf modal khulne / channel badalne par, aur sirf permission ho to (pehle page khulte hi 403 toast aata tha).
  const selectChannel = (channel: ReminderChannel) => {
    setEmailPreview(null);
    if (channel !== "EMAIL" && channel !== "SMS") {
      setReminderForm({ channel, templateId: "" });
      return;
    }
    const cached = templatesByChannel[channel];
    setReminderForm({ channel, templateId: cached?.[0]?.id ? String(cached[0].id) : "" });
    if (cached || !canViewTemplates(channel)) {
      return;
    }
    const loader = channel === "SMS" ? getActiveSmsTemplates : getActiveEmailTemplates;
    void loader()
      .then((data) => {
        setTemplatesByChannel((current) => ({ ...current, [channel]: data }));
        setReminderForm((current) => (current.channel === channel && !current.templateId
          ? { ...current, templateId: data[0]?.id ? String(data[0].id) : "" }
          : current));
      })
      .catch((err: any) => setApiError(err, "Unable to load templates"));
  };

  const overdueCustomerColumns = useMemo(() => [
    {
      key: "customer",
      header: "Customer",
      render: (item: OverdueCustomer) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-white">
            {item.customerName}
            {!item.active ? <span className="ml-2 align-middle"><StatusBadge label="Inactive" /></span> : null}
          </p>
          <p className="text-xs text-slate-400">{item.mobile}</p>
        </div>
      )
    },
    {
      key: "balance",
      header: "Balance",
      className: "text-right",
      render: (item: OverdueCustomer) => (
        <span className="block text-right font-semibold text-rose-200">
          {formatCurrency(item.currentBalance)}
        </span>
      )
    },
    { key: "overdue", header: "Overdue Days", render: (item: OverdueCustomer) => item.overdueDays },
    { key: "oldest", header: "Oldest Due", render: (item: OverdueCustomer) => formatDate(item.oldestOutstandingInvoiceDate) },
    {
      key: "lastStatus",
      header: "Last Reminder",
      render: (item: OverdueCustomer) =>
        item.lastReminderStatus ? (
          <div className="space-y-1">
            <StatusBadge label={item.lastReminderStatus} />
            <p className="text-xs text-slate-400">{formatDateTime(item.lastReminderAt)}</p>
          </div>
        ) : (
          <span className="text-slate-400">No history</span>
        )
    }
  ], []);
  const visibleOverdueCustomerColumns = useMemo(
    () => applyVisibleColumns(overdueCustomerColumns, visibleColumns),
    [overdueCustomerColumns, visibleColumns]
  );
  const overdueCustomerActionColumn = useMemo(() => ({
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (item: OverdueCustomer) => (
      <ActionDropdown
        actions={[
          {
            label: "Send reminder",
            icon: <BellRing size={15} />,
            // Inactive customer ko backend reminder bhejne nahi deta.
            hidden: !can("OUTSTANDING", "ADD") || !item.active,
            onClick: () => {
              setReminderTarget(item);
              selectChannel("EMAIL");
            }
          },
          {
            label: "History",
            icon: <History size={15} />,
            onClick: () => setHistoryTarget({ id: item.customerId, name: item.customerName })
          }
        ]}
      />
    )
  }), [can, templatesByChannel]);

  const previewReminder = async () => {
    if (!reminderForm.templateId || !reminderTarget) {
      return;
    }
    clearMessage();
    try {
      const rendered = reminderForm.channel === "SMS"
        ? await previewSmsTemplate(Number(reminderForm.templateId), reminderVariables(reminderTarget))
        : await previewEmailTemplate(Number(reminderForm.templateId), reminderVariables(reminderTarget));
      setEmailPreview(rendered);
    } catch (err: any) {
      setApiError(err, "Unable to preview reminder email");
    }
  };

  const sendCustomerReminder = async () => {
    if (!reminderTarget || sending) {
      return;
    }
    clearMessage();
    setSending(true);
    try {
      const result = await sendReminder({
        customerId: reminderTarget.customerId,
        channel: reminderForm.channel,
        templateId: reminderForm.templateId ? Number(reminderForm.templateId) : undefined
      });
      // Backend 200 ke saath FAILED bhi lauta sakta hai (provider fail): pehle bhi "sent" dikhta tha.
      if (result?.status === "FAILED") {
        notificationService.showError("Reminder could not be sent. Check the email/SMS settings and try again.");
      } else if (result?.status === "PENDING") {
        notificationService.showInfo("Reminder queued. It will be sent shortly.");
      } else {
        notificationService.showSuccess("Reminder sent successfully.");
      }
      setReminderTarget(null);
      setEmailPreview(null);
      list.refreshTable();
      setSummaryVersion((version) => version + 1);
    } catch (err: any) {
      setApiError(err, "Unable to send reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <CommonListPage<OverdueCustomer, OutstandingFilters>
      pageTitle="Outstanding Reminders"
      pageSubtitle="Search overdue customers, review due balances, and trigger reminder workflows that are logged by the backend."
      list={list}
      searchPlaceholder="Search Customer"
      activeFilterCount={(filters) => (filters.minBalance ? 1 : 0) + (filters.overdueDays ? 1 : 0)}
      filtersClassName="grid gap-3 md:grid-cols-2"
      statCards={
        <GlassCard className="p-6 md:p-7">
          <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Reminder overview</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Outstanding customers</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{summary?.customerCount ?? list.paginationInfo.totalRecords}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Total due amount</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{summary ? formatCurrency(summary.totalDue) : "--"}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Oldest due (days)</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{summary ? summary.maxOverdueDays : "--"}</p>
            </div>
          </div>
        </GlassCard>
      }
      filterFields={
        <>
          <Input
            label="Minimum balance"
            type="number"
            step="0.01"
            value={list.formFilters.minBalance}
            onChange={(event) => list.updateFormFilters({ minBalance: event.target.value })}
          />
          <Input
            label="Overdue days"
            type="number"
            value={list.formFilters.overdueDays}
            onChange={(event) => list.updateFormFilters({ overdueDays: event.target.value })}
          />
        </>
      }
      columnSelector={{ tableName: "OUTSTANDING_CUSTOMERS", columns: overdueCustomerColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["customer"] }}
      tableColumns={[...visibleOverdueCustomerColumns, overdueCustomerActionColumn]}
      emptyMessage={list.loading ? "Loading overdue customers..." : "No overdue customers match the current filters."}
      modals={
        <>
          <ReminderHistoryModal
            open={Boolean(historyTarget)}
            customerId={historyTarget?.id ?? null}
            customerName={historyTarget?.name ?? ""}
            onClose={() => setHistoryTarget(null)}
          />
          <Modal open={Boolean(reminderTarget)} title="Send Reminder" onClose={() => setReminderTarget(null)}>
            {reminderTarget ? (
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-4">
                  <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Customer</p>
                    <p className="mt-2 font-semibold text-slate-950">{reminderTarget.customerName}</p>
                    <p className="text-sm text-slate-500">{reminderTarget.email || reminderTarget.mobile}</p>
                    <p className="mt-3 text-sm font-semibold text-rose-700">{formatCurrency(reminderTarget.currentBalance)}</p>
                  </div>
                  <Select
                    label="Reminder Channel"
                    placeholder={null}
                    options={channelOptions.map((item) => ({ label: item.label, value: item.value }))}
                    value={reminderForm.channel}
                    onChange={(event) => selectChannel(event.target.value as ReminderChannel)}
                  />
                  <Select
                    label="Template"
                    placeholder="Select Template"
                    options={templates.map((template) => ({ label: template.templateName, value: String(template.id) }))}
                    value={reminderForm.templateId}
                    onChange={(event) => {
                      setReminderForm((current) => ({ ...current, templateId: event.target.value }));
                      setEmailPreview(null);
                    }}
                    disabled={reminderForm.channel === "WHATSAPP"}
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={reminderForm.channel === "WHATSAPP" || !reminderForm.templateId}
                      onClick={() => void previewReminder()}
                    >
                      Preview
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        (reminderForm.channel === "EMAIL" && (!reminderForm.templateId || !reminderTarget.email))
                        || (reminderForm.channel === "SMS" && !reminderForm.templateId)
                        || (reminderForm.channel === "WHATSAPP" && !reminderTarget.mobile)
                        || sending
                      }
                      onClick={() => void sendCustomerReminder()}
                    >
                      {sending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                  {!canViewTemplates(reminderForm.channel) ? (
                    <p className="text-sm text-rose-700">You don't have permission to view {reminderForm.channel === "SMS" ? "SMS" : "email"} templates. Ask an admin to allow it.</p>
                  ) : (reminderForm.channel === "EMAIL" || reminderForm.channel === "SMS") && templatesByChannel[reminderForm.channel]?.length === 0 ? (
                    <p className="text-sm text-rose-700">No active {reminderForm.channel === "SMS" ? "SMS" : "email"} template. Create one in Setup first.</p>
                  ) : reminderForm.channel === "EMAIL" && !reminderTarget.email ? (
                    <p className="text-sm text-rose-700">Customer email missing. Add email before sending reminder.</p>
                  ) : reminderForm.channel === "WHATSAPP" && !reminderTarget.mobile ? (
                    <p className="text-sm text-rose-700">Customer mobile number missing. Add mobile before sending reminder.</p>
                  ) : null}
                </div>
                <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Preview</p>
                  {emailPreview ? (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Subject</p>
                        <PreviewSurface className="mt-1 rounded-xl px-3 py-2 text-sm">{emailPreview.subject}</PreviewSurface>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Email Body</p>
                        <PreviewSurface className="mt-1 min-h-[220px] rounded-xl px-3 py-2 text-sm leading-6">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(emailPreview.emailBody) }} />
                        </PreviewSurface>
                      </div>
                    </div>
                  ) : (
                    <PreviewSurface className="mt-4 flex min-h-[280px] items-center justify-center rounded-xl border-dashed text-sm">
                      {reminderForm.channel === "WHATSAPP" ? "WhatsApp reminders use direct message delivery." : "Preview email before sending."}
                    </PreviewSurface>
                  )}
                </div>
              </div>
            ) : null}
          </Modal>
        </>
      }
    />
  );
};

const reminderVariables = (customer: OverdueCustomer) => ({
  Customer_Name: customer.customerName,
  Customer_Email: customer.email ?? "",
  Customer_Mobile: customer.mobile ?? "",
  Outstanding_Amount: customer.currentBalance.toFixed(2),
  Invoice_Number: customer.oldestOutstandingInvoiceNo ?? "",
  Invoice_Date: customer.oldestOutstandingInvoiceDate ? formatDate(customer.oldestOutstandingInvoiceDate) : "",
  Invoice_Total: customer.oldestOutstandingInvoiceTotal != null ? customer.oldestOutstandingInvoiceTotal.toFixed(2) : "",
  Due_Date: customer.oldestOutstandingInvoiceDate ? formatDate(customer.oldestOutstandingInvoiceDate) : "",
  Current_Date: formatDate(localIsoDate())
});

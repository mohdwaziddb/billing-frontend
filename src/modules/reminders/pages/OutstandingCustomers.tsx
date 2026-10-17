import { useEffect, useMemo, useState } from "react";
import { BellRing, History } from "lucide-react";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { useListPage } from "../../../hooks/useListPage";
import { formatCurrency } from "../../../lib/currency";
import { formatDate, formatDateTime } from "../../../lib/format";
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
import { getOverdueCustomers, sendReminder } from "../reminder.api";
import type { OverdueCustomer, ReminderChannel } from "../reminder.types";
import type { EmailPreview, EmailTemplate, SmsTemplate } from "../../../types/api";

const channelOptions = [
  { label: "Email", value: "EMAIL" },
  { label: "SMS", value: "SMS" },
  { label: "WhatsApp", value: "WHATSAPP" }
] as const;

type OutstandingFilters = {
  search: string;
  minBalance: string;
  overdueDays: string;
  channel: ReminderChannel;
};

const emptyFilters: OutstandingFilters = {
  search: "",
  minBalance: "",
  overdueDays: "",
  channel: "EMAIL"
};

export const OutstandingCustomersReminderPage = () => {
  const { clearMessage, setApiError } = useApiMessage();
  const { can } = useAuth();
  const [historyTarget, setHistoryTarget] = useState<{ id: number; name: string } | null>(null);
  const [templates, setTemplates] = useState<Array<EmailTemplate | SmsTemplate>>([]);
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
    fetchPage: ({ page, size, filters }) =>
      getOverdueCustomers({
        search: filters.search || undefined,
        minBalance: filters.minBalance ? Number(filters.minBalance) : undefined,
        overdueDays: filters.overdueDays ? Number(filters.overdueDays) : undefined,
        page,
        size
      })
  });

  useEffect(() => {
    void getActiveEmailTemplates().then((data) => {
      setTemplates(data);
      setReminderForm((current) => ({ ...current, templateId: data[0]?.id ? String(data[0].id) : "" }));
    }).catch(() => setTemplates([]));
  }, []);

  const outstandingTotal = useMemo(
    () => list.tableData.reduce((sum, customer) => sum + customer.currentBalance, 0),
    [list.tableData]
  );

  const overdueCustomerColumns = useMemo(() => [
    {
      key: "customer",
      header: "Customer",
      render: (item: OverdueCustomer) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-white">{item.customerName}</p>
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
            hidden: !can("OUTSTANDING", "ADD"),
            onClick: () => {
              setReminderTarget(item);
              setEmailPreview(null);
              setReminderForm({
                channel: "EMAIL",
                templateId: templates[0]?.id ? String(templates[0].id) : ""
              });
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
  }), [can, templates]);

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
    if (!reminderTarget) {
      return;
    }
    clearMessage();
    try {
      await sendReminder({
        customerId: reminderTarget.customerId,
        channel: reminderForm.channel,
        templateId: reminderForm.templateId ? Number(reminderForm.templateId) : undefined
      });
      notificationService.showSuccess("Reminder sent successfully.");
      setReminderTarget(null);
      setEmailPreview(null);
      list.refreshTable();
    } catch (err: any) {
      setApiError(err, "Unable to send reminder");
    }
  };

  return (
    <CommonListPage<OverdueCustomer, OutstandingFilters>
      pageTitle="Outstanding Reminders"
      pageSubtitle="Search overdue customers, review due balances, and trigger reminder workflows that are logged by the backend."
      list={list}
      searchPlaceholder="Search Customer"
      activeFilterCount={(filters) => (filters.minBalance ? 1 : 0) + (filters.overdueDays ? 1 : 0) + (filters.channel !== "EMAIL" ? 1 : 0)}
      filtersClassName="grid gap-3 md:grid-cols-2"
      statCards={
        <GlassCard className="p-6 md:p-7">
          <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Reminder overview</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Outstanding customers</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{list.paginationInfo.totalRecords}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Total due amount</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{formatCurrency(outstandingTotal)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Selected reminder channel</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100">
                <BellRing size={16} />
                {list.activeFilters.channel}
              </div>
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
          <Select
            label="Reminder Channel"
            placeholder="Select Reminder Channel"
            options={channelOptions.map((item) => ({ label: item.label, value: item.value }))}
            value={list.formFilters.channel}
            onChange={(event) =>
              list.updateFormFilters({ channel: event.target.value as ReminderChannel })
            }
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
                    onChange={(event) => {
                      const channel = event.target.value as ReminderChannel;
                      setReminderForm((current) => ({ ...current, channel }));
                      setEmailPreview(null);
                      const loader = channel === "SMS" ? getActiveSmsTemplates : getActiveEmailTemplates;
                      void loader().then((data) => {
                        setTemplates(data);
                        setReminderForm((current) => ({ ...current, templateId: data[0]?.id ? String(data[0].id) : "" }));
                      }).catch(() => setTemplates([]));
                    }}
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
                      }
                      onClick={() => void sendCustomerReminder()}
                    >
                      Send
                    </Button>
                  </div>
                  {reminderForm.channel === "EMAIL" && !reminderTarget.email ? (
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
  Outstanding_Amount: customer.currentBalance.toFixed(2),
  Due_Date: customer.oldestOutstandingInvoiceDate ? formatDate(customer.oldestOutstandingInvoiceDate) : "",
  Current_Date: formatDate(new Date().toISOString().slice(0, 10))
});

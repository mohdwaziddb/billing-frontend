import { useEffect, useMemo, useState } from "react";
import { BellRing, Filter, History } from "lucide-react";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { formatCurrency } from "../../../lib/currency";
import { formatDate, formatDateTime } from "../../../lib/format";
import { Button } from "../../../components/Button";
import { ActionDropdown } from "../../../components/ActionDropdown";
import { CommonColumnSelector, applyVisibleColumns } from "../../../components/CommonColumnSelector";
import { GlassCard } from "../../../components/GlassCard";
import { Header } from "../../../components/Header";
import { Input } from "../../../components/Input";
import { Modal } from "../../../components/Modal";
import { Select } from "../../../components/Select";
import { PreviewSurface } from "../../../components/PreviewSurface";
import { StatusBadge } from "../../../components/StatusBadge";
import { Table } from "../../../components/Table";
import { DEFAULT_PAGE_SIZE, Pagination } from "../../../components/Pagination";
import { useAuth } from "../../../context/AuthContext";
import { ReminderHistoryModal } from "../components/ReminderHistoryModal";
import { getActiveEmailTemplates, previewEmailTemplate } from "../../../api/emailTemplates";
import { getActiveSmsTemplates, previewSmsTemplate } from "../../../api/smsTemplates";
import { getOverdueCustomers, sendReminder } from "../reminder.api";
import type { OverdueCustomer, ReminderChannel } from "../reminder.types";
import type { EmailPreview, EmailTemplate, PageResponse, SmsTemplate } from "../../../types/api";

const channelOptions = [
  { label: "Email", value: "EMAIL" },
  { label: "SMS", value: "SMS" },
  { label: "WhatsApp (Future)", value: "WHATSAPP" }
] as const;

export const OutstandingCustomersReminderPage = () => {
  const [customerPage, setCustomerPage] = useState<PageResponse<OverdueCustomer>>({
    records: [],
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const { clearMessage, setApiError } = useApiMessage();
  const { can } = useAuth();
  const [filters, setFilters] = useState({
    search: "",
    minBalance: "",
    overdueDays: "",
    channel: "EMAIL" as ReminderChannel
  });
  const [historyTarget, setHistoryTarget] = useState<{ id: number; name: string } | null>(null);
  const [templates, setTemplates] = useState<Array<EmailTemplate | SmsTemplate>>([]);
  const [reminderTarget, setReminderTarget] = useState<OverdueCustomer | null>(null);
  const [reminderForm, setReminderForm] = useState<{ channel: ReminderChannel; templateId: string }>({
    channel: "EMAIL",
    templateId: ""
  });
  const [emailPreview, setEmailPreview] = useState<EmailPreview | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  const loadCustomers = async (nextFilters: typeof filters = filters, nextPage = 0) => {
    setLoading(true);
    clearMessage();
    try {
      const data = await getOverdueCustomers({
        search: nextFilters.search || undefined,
        minBalance: nextFilters.minBalance ? Number(nextFilters.minBalance) : undefined,
        overdueDays: nextFilters.overdueDays ? Number(nextFilters.overdueDays) : undefined,
        page: nextPage,
        size: DEFAULT_PAGE_SIZE
      });
      setCustomerPage(data);
    } catch (err: any) {
      setApiError(err, "Unable to load overdue customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCustomers();
    void getActiveEmailTemplates().then((data) => {
      setTemplates(data);
      setReminderForm((current) => ({ ...current, templateId: data[0]?.id ? String(data[0].id) : "" }));
    }).catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outstandingTotal = useMemo(
    () => customerPage.records.reduce((sum, customer) => sum + customer.currentBalance, 0),
    [customerPage.records]
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
    setSuccessToast("");
    try {
      await sendReminder({
        customerId: reminderTarget.customerId,
        channel: reminderForm.channel,
        templateId: reminderForm.templateId ? Number(reminderForm.templateId) : undefined
      });
      setSuccessToast("Reminder sent successfully.");
      setReminderTarget(null);
      setEmailPreview(null);
      await loadCustomers(filters, customerPage.page);
    } catch (err: any) {
      setApiError(err, "Unable to send reminder");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Outstanding Reminders"
        subtitle="Search overdue customers, review due balances, and trigger reminder workflows that are logged by the backend."
      />

      {successToast ? (
        <div className="glass rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">
          {successToast}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <Filter className="text-sky-100" size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reminder filters</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Customer Reminder Filters</h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Search Customer"
              placeholder="Enter Customer Name, Mobile or Email"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <Input
              label="Minimum balance"
              type="number"
              step="0.01"
              value={filters.minBalance}
              onChange={(event) => setFilters((current) => ({ ...current, minBalance: event.target.value }))}
            />
            <Input
              label="Overdue days"
              type="number"
              value={filters.overdueDays}
              onChange={(event) => setFilters((current) => ({ ...current, overdueDays: event.target.value }))}
            />
            <Select
              label="Reminder Channel"
              placeholder="Select Reminder Channel"
              options={channelOptions.map((item) => ({ label: item.label, value: item.value }))}
              value={filters.channel}
              onChange={(event) =>
                setFilters((current) => ({ ...current, channel: event.target.value as ReminderChannel }))
              }
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void loadCustomers(filters, 0)}>{loading ? "Filtering..." : "Apply filters"}</Button>
            <Button
              variant="ghost"
              onClick={() => {
                const resetFilters = {
                  search: "",
                  minBalance: "",
                  overdueDays: "",
                  channel: "EMAIL" as ReminderChannel
                };
                setFilters(resetFilters);
                void loadCustomers(resetFilters, 0);
              }}
            >
              Reset
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reminder overview</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Outstanding customers</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{customerPage.totalRecords}</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Total due amount</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{formatCurrency(outstandingTotal)}</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 md:col-span-2">
              <p className="text-sm text-slate-400">Selected reminder channel</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-100">
                <BellRing size={16} />
                {filters.channel}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reminder candidates</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Overdue Customer List</h2>
          </div>
          <CommonColumnSelector
            tableName="OUTSTANDING_CUSTOMERS"
            availableColumns={overdueCustomerColumns.map(({ key, header }) => ({ key, header }))}
            visibleColumns={visibleColumns}
            onApply={setVisibleColumns}
          />
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300/75">
            Loading overdue customers...
          </div>
        ) : (
          <Table
            data={customerPage.records}
            emptyText="No overdue customers match the current filters."
            columns={[...visibleOverdueCustomerColumns, overdueCustomerActionColumn]}
          />
        )}
        <Pagination
          page={customerPage.page}
          size={customerPage.size}
          totalRecords={customerPage.totalRecords}
          totalPages={customerPage.totalPages}
          disabled={loading}
          onPageChange={(nextPage) => void loadCustomers(filters, nextPage)}
        />
      </GlassCard>

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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Customer</p>
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
                  disabled={(reminderForm.channel === "EMAIL" && (!reminderForm.templateId || !reminderTarget.email)) || (reminderForm.channel === "SMS" && !reminderForm.templateId)}
                  onClick={() => void sendCustomerReminder()}
                >
                  Send
                </Button>
              </div>
              {reminderForm.channel === "EMAIL" && !reminderTarget.email ? (
                <p className="text-sm text-rose-700">Customer email missing. Add email before sending reminder.</p>
              ) : null}
            </div>
            <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Preview</p>
              {emailPreview ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Subject</p>
                    <PreviewSurface className="mt-1 rounded-xl px-3 py-2 text-sm">{emailPreview.subject}</PreviewSurface>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Email Body</p>
                    <PreviewSurface className="mt-1 min-h-[220px] rounded-xl px-3 py-2 text-sm leading-6">
                      <div dangerouslySetInnerHTML={{ __html: emailPreview.emailBody }} />
                    </PreviewSurface>
                  </div>
                </div>
              ) : (
                <PreviewSurface className="mt-4 flex min-h-[280px] items-center justify-center rounded-xl border-dashed text-sm">
                  Preview email before sending.
                </PreviewSurface>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

const reminderVariables = (customer: OverdueCustomer) => ({
  Customer_Name: customer.customerName,
  Customer_Email: customer.email ?? "",
  Outstanding_Amount: customer.currentBalance.toFixed(2),
  Due_Date: customer.oldestOutstandingInvoiceDate ?? "",
  Current_Date: new Date().toISOString().slice(0, 10)
});

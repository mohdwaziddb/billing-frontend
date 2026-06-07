import { useEffect, useMemo, useState } from "react";
import { BellRing, Filter, History } from "lucide-react";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { formatCurrency } from "../../../lib/currency";
import { formatDate, formatDateTime } from "../../../lib/format";
import { Button } from "../../../components/Button";
import { ActionDropdown } from "../../../components/ActionDropdown";
import { GlassCard } from "../../../components/GlassCard";
import { Header } from "../../../components/Header";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { StatusBadge } from "../../../components/StatusBadge";
import { Table } from "../../../components/Table";
import { DEFAULT_PAGE_SIZE, Pagination } from "../../../components/Pagination";
import { useAuth } from "../../../context/AuthContext";
import { ReminderHistoryModal } from "../components/ReminderHistoryModal";
import { getOverdueCustomers, sendReminder } from "../reminder.api";
import type { OverdueCustomer, ReminderChannel } from "../reminder.types";
import type { PageResponse } from "../../../types/api";

const channelOptions = [
  { label: "SMS", value: "SMS" },
  { label: "WHATSAPP", value: "WHATSAPP" },
  { label: "EMAIL", value: "EMAIL" }
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
  const { message: errorToast, clearMessage, setApiError } = useApiMessage();
  const { can } = useAuth();
  const [filters, setFilters] = useState({
    search: "",
    minBalance: "",
    overdueDays: "",
    channel: "SMS" as ReminderChannel
  });
  const [historyTarget, setHistoryTarget] = useState<{ id: number; name: string } | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outstandingTotal = useMemo(
    () => customerPage.records.reduce((sum, customer) => sum + customer.currentBalance, 0),
    [customerPage.records]
  );

  const sendCustomerReminder = async (customerId: number) => {
    clearMessage();
    setSuccessToast("");
    try {
      await sendReminder({ customerId, channel: filters.channel });
      setSuccessToast("Reminder saved successfully.");
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

      {errorToast ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
          {errorToast}
        </div>
      ) : null}
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
                  channel: "SMS" as ReminderChannel
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
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reminder candidates</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Overdue Customer List</h2>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300/75">
            Loading overdue customers...
          </div>
        ) : (
          <Table
            data={customerPage.records}
            emptyText="No overdue customers match the current filters."
            columns={[
              {
                key: "customer",
                header: "Customer",
                render: (item) => (
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
                render: (item) => (
                  <span className="block text-right font-semibold text-rose-200">
                    {formatCurrency(item.currentBalance)}
                  </span>
                )
              },
              { key: "overdue", header: "Overdue Days", render: (item) => item.overdueDays },
              { key: "oldest", header: "Oldest Due", render: (item) => formatDate(item.oldestOutstandingInvoiceDate) },
              {
                key: "lastStatus",
                header: "Last Reminder",
                render: (item) =>
                  item.lastReminderStatus ? (
                    <div className="space-y-1">
                      <StatusBadge label={item.lastReminderStatus} />
                      <p className="text-xs text-slate-400">{formatDateTime(item.lastReminderAt)}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">No history</span>
                  )
              },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (item) => (
                  <ActionDropdown
                    actions={[
                      {
                        label: "Send reminder",
                        icon: <BellRing size={15} />,
                        hidden: !can("OUTSTANDING", "ADD"),
                        onClick: () => void sendCustomerReminder(item.customerId)
                      },
                      {
                        label: "History",
                        icon: <History size={15} />,
                        onClick: () => setHistoryTarget({ id: item.customerId, name: item.customerName })
                      }
                    ]}
                  />
                )
              }
            ]}
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
    </div>
  );
};

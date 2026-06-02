import { useEffect, useMemo, useState } from "react";
import { BellRing, Filter, History } from "lucide-react";
import { Button } from "../../../components/Button";
import { GlassCard } from "../../../components/GlassCard";
import { Header } from "../../../components/Header";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { StatusBadge } from "../../../components/StatusBadge";
import { Table } from "../../../components/Table";
import { formatCurrency } from "../../../lib/currency";
import { formatDate, formatDateTime } from "../../../lib/format";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { getOverdueCustomers, sendReminder } from "../reminder.api";
import { ReminderHistoryModal } from "../components/ReminderHistoryModal";
import type { OverdueCustomer, ReminderChannel } from "../reminder.types";

const channelOptions = [
  { label: "MOCK", value: "MOCK" },
  { label: "SMS", value: "SMS" },
  { label: "WHATSAPP", value: "WHATSAPP" },
  { label: "EMAIL", value: "EMAIL" }
] as const;

export const OutstandingCustomersReminderPage = () => {
  const [customers, setCustomers] = useState<OverdueCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const { message: errorToast, clearMessage, setApiError } = useApiMessage();
  const [filters, setFilters] = useState({
    search: "",
    minBalance: "",
    overdueDays: "",
    channel: "MOCK" as ReminderChannel
  });
  const [historyTarget, setHistoryTarget] = useState<{ id: number; name: string } | null>(null);

  const loadCustomers = async (
    nextFilters: typeof filters = filters
  ) => {
    setLoading(true);
    clearMessage();
    try {
      const data = await getOverdueCustomers({
        search: nextFilters.search || undefined,
        minBalance: nextFilters.minBalance ? Number(nextFilters.minBalance) : undefined,
        overdueDays: nextFilters.overdueDays ? Number(nextFilters.overdueDays) : undefined
      });
      setCustomers(data);
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
    () => customers.reduce((sum, customer) => sum + customer.currentBalance, 0),
    [customers]
  );

  const sendCustomerReminder = async (customerId: number) => {
    clearMessage();
    setSuccessToast("");
    try {
      await sendReminder({ customerId, channel: filters.channel });
      setSuccessToast("Reminder saved successfully.");
      await loadCustomers();
    } catch (err: any) {
      setApiError(err, "Unable to send reminder");
    }
  };

  return (
    <div className="space-y-4">
      <Header
        title="Outstanding reminders"
        subtitle="Search overdue customers, review due balances, and trigger secure reminder attempts that are generated and logged entirely by the backend."
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
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <Filter className="text-cyan-100" size={18} />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reminder filters</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Find due customers</h2>
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
              onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value as ReminderChannel }))}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void loadCustomers()}>{loading ? "Filtering..." : "Apply filters"}</Button>
            <Button
              variant="ghost"
              onClick={() => {
                const resetFilters = { search: "", minBalance: "", overdueDays: "", channel: "MOCK" as ReminderChannel };
                setFilters(resetFilters);
                void loadCustomers(resetFilters);
              }}
            >
              Reset
            </Button>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reminder overview</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Outstanding customers</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{customers.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">Total due amount</p>
              <p className="mt-3 text-3xl font-extrabold text-white">{formatCurrency(outstandingTotal)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:col-span-2">
              <p className="text-sm text-slate-400">Selected reminder channel</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                <BellRing size={16} />
                {filters.channel}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Reminder candidates</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Overdue customers table</h2>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300/75">
            Loading overdue customers...
          </div>
        ) : (
          <Table
            data={customers}
            emptyText="No overdue customers match the current filters."
            columns={[
              {
                key: "customer",
                header: "Customer",
                render: (item) => (
                  <div>
                    <p className="font-semibold text-white">{item.customerName}</p>
                    <p className="text-xs text-slate-400">{item.mobile}</p>
                  </div>
                )
              },
              { key: "balance", header: "Balance", render: (item) => <span className="font-semibold text-rose-200">{formatCurrency(item.currentBalance)}</span> },
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
                render: (item) => (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void sendCustomerReminder(item.customerId)}>Send reminder</Button>
                    <Button
                      variant="secondary"
                      onClick={() => setHistoryTarget({ id: item.customerId, name: item.customerName })}
                    >
                      <History size={14} />
                      History
                    </Button>
                  </div>
                )
              }
            ]}
          />
        )}
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

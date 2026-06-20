import {
  BarChart3,
  BadgeCheck,
  IndianRupee,
  ReceiptText,
  Search,
  Trophy,
  Wallet
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getSalesReferralReport } from "../api/salesReferrals";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { SalesReferralInvoice, SalesReferralReport, SalesReferralUserSummary } from "../types/api";

type DatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";
type InvoiceSort = "dateDesc" | "amountDesc" | "paidDesc" | "outstandingDesc" | "invoiceNoAsc";
type CardDetail = {
  title: string;
  description: string;
  invoices: SalesReferralInvoice[];
} | null;

const REFERRAL_MODAL_PAGE_SIZE = 10;

const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" }
];

const emptyReport: SalesReferralReport = {
  startDate: null,
  endDate: null,
  totalReferredInvoices: 0,
  totalReferredRevenue: 0,
  thisMonthReferredRevenue: 0,
  topPerformer: null,
  users: [],
  topContributors: [],
  referredInvoices: [],
  thisMonthInvoices: []
};

export const SalesReferralsPage = () => {
  const [preset, setPreset] = useState<DatePreset>("thisYear");
  const [customRange, setCustomRange] = useState(() => buildRange("thisYear"));
  const [report, setReport] = useState<SalesReferralReport>(emptyReport);
  const [selectedUser, setSelectedUser] = useState<SalesReferralUserSummary | null>(null);
  const [cardDetail, setCardDetail] = useState<CardDetail>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const { setApiError } = useApiMessage();

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);
  const paidRevenue = useMemo(() => report.users.reduce((sum, user) => sum + Number(user.paidRevenue ?? 0), 0), [report.users]);
  const outstandingRevenue = useMemo(() => report.users.reduce((sum, user) => sum + Number(user.outstandingRevenue ?? 0), 0), [report.users]);
  const paidInvoices = useMemo(() => report.referredInvoices.filter((invoice) => Number(invoice.paidAmount ?? 0) > 0), [report.referredInvoices]);
  const outstandingInvoices = useMemo(() => report.referredInvoices.filter((invoice) => Number(invoice.outstandingAmount ?? 0) > 0), [report.referredInvoices]);
  const averageInvoiceValue = report.totalReferredInvoices > 0 ? Number(report.totalReferredRevenue ?? 0) / report.totalReferredInvoices : 0;

  useEffect(() => {
    void getSalesReferralReport(activeRange).then(setReport).catch((err: any) => setApiError(err, "Unable to load sales referrals report"));
  }, [activeRange, setApiError]);

  const openCardDetail = (title: string, description: string, invoices: SalesReferralInvoice[]) => {
    setCardDetail({ title, description, invoices });
  };

  return (
    <div className="space-y-5 pb-6">
      <Header title="Sales Referrals" subtitle="Track referred invoice revenue and identify top sales contributors." />

      <GlassCard className="p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Reports" }, { label: "Sales Referrals" }]} />
            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-slate-400">Filters</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Sales Referral Filters</h2>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReferralMetricCard
          title="Total Referred Invoices"
          value={String(report.totalReferredInvoices)}
          caption="Invoices generated with a referral user"
          icon={<ReceiptText size={20} />}
          tone="from-sky-500 to-indigo-600"
          onClick={() => openCardDetail("Total Referred Invoices", "All invoices with Refer By selected.", report.referredInvoices)}
        />
        <ReferralMetricCard
          title="Total Referred Revenue"
          value={formatCurrency(report.totalReferredRevenue)}
          caption="Gross referred invoice value"
          icon={<IndianRupee size={20} />}
          tone="from-emerald-500 to-teal-600"
          onClick={() => openCardDetail("Total Referred Revenue", "Invoices contributing to referred revenue.", report.referredInvoices)}
        />
        <ReferralMetricCard
          title="Paid Revenue"
          value={formatCurrency(paidRevenue)}
          caption="Collections received from referred invoices"
          icon={<BadgeCheck size={20} />}
          tone="from-green-500 to-emerald-600"
          onClick={() => openCardDetail("Paid Revenue", "Paid referred invoices and collected amounts.", paidInvoices)}
        />
        <ReferralMetricCard
          title="Outstanding Revenue"
          value={formatCurrency(outstandingRevenue)}
          caption="Pending balance from referred invoices"
          icon={<Wallet size={20} />}
          tone="from-rose-500 to-orange-500"
          onClick={() => openCardDetail("Outstanding Revenue", "Referred invoices with pending balance.", outstandingInvoices)}
        />
        <ReferralMetricCard
          title="Top Performer"
          value={report.topPerformer?.userName ?? "--"}
          caption={report.topPerformer ? `${formatCurrency(report.topPerformer.totalRevenue)} | ${report.topPerformer.totalInvoices} invoices` : "No referred sales yet"}
          icon={<Trophy size={20} />}
          tone="from-amber-500 to-yellow-600"
          onClick={() => setRankingOpen(true)}
        />
        <ReferralMetricCard
          title="Average Invoice Value"
          value={formatCurrency(averageInvoiceValue)}
          caption="Average value across referred invoices"
          icon={<BarChart3 size={20} />}
          tone="from-violet-500 to-fuchsia-600"
          onClick={() => openCardDetail("Average Invoice Value", "Invoices used for average invoice value calculation.", report.referredInvoices)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <GlassCard className="p-5 md:p-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Performance</p>
              <h3 className="mt-2 text-xl font-extrabold text-slate-950">Referral Analytics</h3>
            </div>
            <p className="text-sm font-semibold text-slate-500">Sorted by highest revenue first</p>
          </div>
          <ReferralUsersTable users={report.users} onSelect={setSelectedUser} />
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Trophy size={20} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ranking</p>
              <h3 className="text-xl font-extrabold text-slate-950">Top 10 Sales Contributors</h3>
            </div>
          </div>
          <div className="space-y-3">
            {report.topContributors.length ? report.topContributors.map((item, index) => (
              <button
                key={item.userId}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--theme-color)] hover:shadow-sm"
                onClick={() => setSelectedUser(item)}
              >
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-950">#{index + 1} {item.userName}</p>
                  <p className="text-sm text-slate-500">{item.totalInvoices} invoices</p>
                </div>
                <p className="font-black text-[var(--theme-color)]">{formatCurrency(item.totalRevenue)}</p>
              </button>
            )) : <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No contributors yet.</p>}
          </div>
        </GlassCard>
      </div>

      <Modal open={Boolean(selectedUser)} title={selectedUser ? `${selectedUser.userName} Referral Details` : "Referral Details"} onClose={() => setSelectedUser(null)}>
        {selectedUser ? <UserDetail user={selectedUser} /> : null}
      </Modal>

      <Modal open={Boolean(cardDetail)} title={cardDetail?.title ?? "Details"} onClose={() => setCardDetail(null)}>
        <InvoiceDrilldown description={cardDetail?.description ?? ""} invoices={cardDetail?.invoices ?? []} />
      </Modal>

      <Modal open={rankingOpen} title="Complete Sales Contributor Ranking" onClose={() => setRankingOpen(false)}>
        <RankingDrilldown users={report.users} onSelectUser={setSelectedUser} />
      </Modal>
    </div>
  );
};

const ReferralMetricCard = ({
  title,
  value,
  caption,
  icon,
  tone,
  onClick
}: {
  title: string;
  value: string;
  caption: string;
  icon: ReactNode;
  tone: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="group relative min-h-[178px] overflow-hidden rounded-2xl border border-white/70 bg-white p-5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
    onClick={onClick}
  >
    <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${tone}`} />
    <span className={`absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${tone} opacity-15 transition group-hover:scale-110`} />
    <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
      {icon}
    </span>
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{title}</p>
    <p className="mt-3 break-words text-2xl font-black text-slate-950">{value}</p>
    <p className="mt-2 text-sm font-semibold text-slate-500">{caption}</p>
  </button>
);

const ReferralUsersTable = ({ users, onSelect }: { users: SalesReferralUserSummary[]; onSelect: (user: SalesReferralUserSummary) => void }) => {
  if (!users.length) {
    return <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No referred invoices found for this date range.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1.3fr_1fr_0.75fr_repeat(4,1fr)] gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
        <span>User Name</span>
        <span>Username</span>
        <span className="text-right">Invoices</span>
        <span className="text-right">Total Revenue</span>
        <span className="text-right">Paid Revenue</span>
        <span className="text-right">Outstanding</span>
        <span className="text-right">Average Value</span>
      </div>
      {users.map((user) => (
        <button
          key={user.userId}
          type="button"
          className="grid w-full gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-[var(--theme-color)] hover:bg-[color-mix(in_srgb,var(--theme-color)_5%,white)] xl:grid-cols-[1.3fr_1fr_0.75fr_repeat(4,1fr)] xl:items-center"
          onClick={() => onSelect(user)}
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-400 xl:hidden">User Name</span>
            <span className="font-extrabold text-slate-950">{user.userName}</span>
          </span>
          <DataCell label="Username" value={user.username} />
          <DataCell label="Invoices" value={String(user.totalInvoices)} alignRight />
          <DataCell label="Total Revenue" value={formatCurrency(user.totalRevenue)} alignRight strong />
          <DataCell label="Paid Revenue" value={formatCurrency(user.paidRevenue)} alignRight />
          <DataCell label="Outstanding" value={formatCurrency(user.outstandingRevenue)} alignRight tone="text-rose-600" />
          <DataCell label="Average Value" value={formatCurrency(user.averageInvoiceValue)} alignRight />
        </button>
      ))}
    </div>
  );
};

const UserDetail = ({ user }: { user: SalesReferralUserSummary }) => (
  <div className="space-y-5">
    <div className="grid gap-3 md:grid-cols-4">
      <SummaryMini label="Total Invoices" value={String(user.totalInvoices)} />
      <SummaryMini label="Revenue" value={formatCurrency(user.totalRevenue)} />
      <SummaryMini label="Paid" value={formatCurrency(user.paidRevenue)} />
      <SummaryMini label="Outstanding" value={formatCurrency(user.outstandingRevenue)} />
    </div>
    <InvoiceDrilldown description="Invoice-level details for this referral user." invoices={user.invoices} />
  </div>
);

const InvoiceDrilldown = ({ description, invoices }: { description: string; invoices: SalesReferralInvoice[] }) => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<InvoiceSort>("dateDesc");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [invoices, search, sort]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = query
      ? invoices.filter((invoice) =>
          [invoice.invoiceNo, invoice.customerName, invoice.invoiceDate].some((value) => String(value ?? "").toLowerCase().includes(query))
        )
      : invoices;
    return [...rows].sort((left, right) => compareInvoices(left, right, sort));
  }, [invoices, search, sort]);

  const totalPages = Math.ceil(filtered.length / REFERRAL_MODAL_PAGE_SIZE);
  const pagedInvoices = filtered.slice(page * REFERRAL_MODAL_PAGE_SIZE, page * REFERRAL_MODAL_PAGE_SIZE + REFERRAL_MODAL_PAGE_SIZE);

  return (
    <div className="space-y-4">
      {description ? <p className="text-sm font-medium text-slate-500">{description}</p> : null}
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Input
            label="Search"
            value={search}
            placeholder="Invoice number or customer"
            className="pl-10"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Search className="pointer-events-none absolute bottom-3.5 left-3 text-slate-400" size={18} />
        </div>
        <Select
          label="Sort"
          value={sort}
          placeholder={null}
          options={[
            { label: "Newest First", value: "dateDesc" },
            { label: "Highest Amount", value: "amountDesc" },
            { label: "Highest Paid", value: "paidDesc" },
            { label: "Highest Outstanding", value: "outstandingDesc" },
            { label: "Invoice Number", value: "invoiceNoAsc" }
          ]}
          onChange={(event) => setSort(event.target.value as InvoiceSort)}
        />
      </div>
      <InvoiceRows invoices={pagedInvoices} />
      <Pagination page={page} size={REFERRAL_MODAL_PAGE_SIZE} totalRecords={filtered.length} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

const InvoiceRows = ({ invoices }: { invoices: SalesReferralInvoice[] }) => {
  if (!invoices.length) {
    return <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No invoices found.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1fr_1.15fr_1.2fr_0.85fr_repeat(3,0.8fr)] gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
        <span>Invoice Number</span>
        <span>Customer</span>
        <span>Refer User</span>
        <span>Invoice Date</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Paid</span>
        <span className="text-right">Outstanding</span>
      </div>
      {invoices.map((invoice) => (
        <div key={invoice.invoiceId} className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 lg:grid-cols-[1fr_1.15fr_1.2fr_0.85fr_repeat(3,0.8fr)] lg:items-center">
          <DataCell label="Invoice Number" value={invoice.invoiceNo} strong />
          <DataCell label="Customer" value={invoice.customerName} />
          <DataCell label="Refer User" value={formatInvoiceReferUser(invoice)} />
          <DataCell label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
          <DataCell label="Amount" value={formatCurrency(invoice.amount)} alignRight />
          <DataCell label="Paid" value={formatCurrency(invoice.paidAmount)} alignRight />
          <DataCell label="Outstanding" value={formatCurrency(invoice.outstandingAmount)} alignRight tone="text-rose-600" />
        </div>
      ))}
    </div>
  );
};

const RankingDrilldown = ({ users, onSelectUser }: { users: SalesReferralUserSummary[]; onSelectUser: (user: SalesReferralUserSummary) => void }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [search, users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users
      .filter((user) => !query || [user.userName, user.username].some((value) => String(value ?? "").toLowerCase().includes(query)))
      .sort((left, right) => Number(right.totalRevenue ?? 0) - Number(left.totalRevenue ?? 0));
  }, [search, users]);
  const totalPages = Math.ceil(filtered.length / REFERRAL_MODAL_PAGE_SIZE);
  const pagedUsers = filtered.slice(page * REFERRAL_MODAL_PAGE_SIZE, page * REFERRAL_MODAL_PAGE_SIZE + REFERRAL_MODAL_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="relative md:max-w-md">
        <Input label="Search" value={search} placeholder="User name or username" className="pl-10" onChange={(event) => setSearch(event.target.value)} />
        <Search className="pointer-events-none absolute bottom-3.5 left-3 text-slate-400" size={18} />
      </div>
      <div className="space-y-3">
        {pagedUsers.length ? pagedUsers.map((user, index) => (
          <button
            key={user.userId}
            type="button"
            className="grid w-full gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-[var(--theme-color)] lg:grid-cols-[80px_1.3fr_repeat(3,1fr)] lg:items-center"
            onClick={() => onSelectUser(user)}
          >
            <span className="text-xl font-black text-[var(--theme-color)]">#{page * REFERRAL_MODAL_PAGE_SIZE + index + 1}</span>
            <span>
              <span className="block font-extrabold text-slate-950">{user.userName}</span>
              <span className="text-sm text-slate-500">{user.username}</span>
            </span>
            <DataCell label="Revenue" value={formatCurrency(user.totalRevenue)} alignRight strong />
            <DataCell label="Invoice Count" value={String(user.totalInvoices)} alignRight />
            <DataCell label="Average Value" value={formatCurrency(user.averageInvoiceValue)} alignRight />
          </button>
        )) : <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No contributors found.</p>}
      </div>
      <Pagination page={page} size={REFERRAL_MODAL_PAGE_SIZE} totalRecords={filtered.length} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

const SummaryMini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
  </div>
);

const DataCell = ({
  label,
  value,
  alignRight = false,
  strong = false,
  tone = "text-slate-700"
}: {
  label: string;
  value: string;
  alignRight?: boolean;
  strong?: boolean;
  tone?: string;
}) => (
  <span className={alignRight ? "text-left lg:text-right xl:text-right" : ""}>
    <span className="block text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden xl:hidden">{label}</span>
    <span className={`${strong ? "font-extrabold text-slate-950" : `font-semibold ${tone}`}`}>{value}</span>
  </span>
);

const formatInvoiceReferUser = (invoice: SalesReferralInvoice) => {
  if (!invoice.referByUserName) {
    return "--";
  }
  return `${invoice.referByUserName} (${invoice.referByUserMobileNumber || "--"})`;
};

const buildRange = (preset: DatePreset) => {
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
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toIso(start), endDate: toIso(today) };
  }
  const start = new Date(today.getFullYear(), 0, 1);
  return { startDate: toIso(start), endDate: toIso(today) };
};

const toIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const compareInvoices = (left: SalesReferralInvoice, right: SalesReferralInvoice, sort: InvoiceSort) => {
  if (sort === "amountDesc") {
    return Number(right.amount ?? 0) - Number(left.amount ?? 0);
  }
  if (sort === "paidDesc") {
    return Number(right.paidAmount ?? 0) - Number(left.paidAmount ?? 0);
  }
  if (sort === "outstandingDesc") {
    return Number(right.outstandingAmount ?? 0) - Number(left.outstandingAmount ?? 0);
  }
  if (sort === "invoiceNoAsc") {
    return String(left.invoiceNo ?? "").localeCompare(String(right.invoiceNo ?? ""));
  }
  return String(right.invoiceDate ?? "").localeCompare(String(left.invoiceDate ?? ""));
};

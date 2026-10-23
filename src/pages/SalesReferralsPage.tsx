import {
  BarChart3,
  BadgeCheck,
  IndianRupee,
  ReceiptText,
  Search,
  Trophy,
  Wallet
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSalesReferralReport } from "../api/salesReferrals";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { ANALYTICS_COLORS } from "../components/analytics/AnalyticsCharts";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
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
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SalesReferralUserSummary | null>(null);
  const [cardDetail, setCardDetail] = useState<CardDetail>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const { setApiError } = useApiMessage();
  const isDark = useIsDarkMode();
  const colors = isDark ? ANALYTICS_COLORS.dark : ANALYTICS_COLORS.light;

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);
  const totalRevenue = Number(report.totalReferredRevenue ?? 0);
  const paidRevenue = useMemo(() => report.users.reduce((sum, user) => sum + Number(user.paidRevenue ?? 0), 0), [report.users]);
  const outstandingRevenue = useMemo(() => report.users.reduce((sum, user) => sum + Number(user.outstandingRevenue ?? 0), 0), [report.users]);
  const paidInvoices = useMemo(() => report.referredInvoices.filter((invoice) => Number(invoice.paidAmount ?? 0) > 0), [report.referredInvoices]);
  const outstandingInvoices = useMemo(() => report.referredInvoices.filter((invoice) => Number(invoice.outstandingAmount ?? 0) > 0), [report.referredInvoices]);
  const averageInvoiceValue = report.totalReferredInvoices > 0 ? totalRevenue / report.totalReferredInvoices : 0;
  const collectedPct = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;
  const maxUserRevenue = Math.max(0, ...report.topContributors.map((user) => Number(user.totalRevenue ?? 0)));

  useEffect(() => {
    setLoading(true);
    void getSalesReferralReport(activeRange)
      .then(setReport)
      .catch((err: any) => setApiError(err, "Unable to load sales referrals report"))
      .finally(() => setLoading(false));
  }, [activeRange, setApiError]);

  const openCardDetail = (title: string, description: string, invoices: SalesReferralInvoice[]) => {
    setCardDetail({ title, description, invoices });
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Sales Referrals" subtitle="Revenue brought in by each referring team member, and how much of it is collected." />

      {/* Dashboard jaisa: heading left, date filter right. */}
      <GlassCard className="p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Filters</p>
            <h2 className="fs-18 mt-1.5 font-semibold text-slate-950">Sales Referral Filters</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESET_OPTIONS.map(({ value, label }) => (
              <Button key={value} type="button" variant={preset === value ? "primary" : "secondary"} onClick={() => setPreset(value)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        {preset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:max-w-xl">
            <Input label="Start date" type="date" value={customRange.startDate} onChange={(event) => setCustomRange((current) => ({ ...current, startDate: event.target.value }))} />
            <Input label="End date" type="date" value={customRange.endDate} onChange={(event) => setCustomRange((current) => ({ ...current, endDate: event.target.value }))} />
          </div>
        ) : null}
      </GlassCard>

      {/* Baaki reports jaise StatCard. "Top Performer" card hata diya — wahi ranking me #1 hai. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Referred Invoices" value={String(report.totalReferredInvoices)} caption={`${report.users.length} referrer${report.users.length === 1 ? "" : "s"}`} icon={<ReceiptText size={18} />}
          onClick={() => openCardDetail("Referred Invoices", "All invoices with Refer By selected.", report.referredInvoices)} />
        <StatCard label="Referred Revenue" value={formatCurrency(totalRevenue)} caption="Invoice value incl. GST" icon={<IndianRupee size={18} />}
          onClick={() => openCardDetail("Referred Revenue", "Invoices contributing to referred revenue.", report.referredInvoices)} />
        <StatCard label="Collected" value={formatCurrency(paidRevenue)} caption={totalRevenue > 0 ? `${collectedPct}% of referred revenue` : "Nothing referred yet"} icon={<BadgeCheck size={18} />}
          onClick={() => openCardDetail("Collected", "Referred invoices with at least one payment.", paidInvoices)} />
        <StatCard label="Outstanding" value={formatCurrency(outstandingRevenue)} caption={`${outstandingInvoices.length} invoice${outstandingInvoices.length === 1 ? "" : "s"} pending`} icon={<Wallet size={18} />}
          onClick={() => openCardDetail("Outstanding", "Referred invoices with pending balance.", outstandingInvoices)} />
        <StatCard label="Avg Invoice" value={formatCurrency(averageInvoiceValue)} caption="Per referred invoice" icon={<BarChart3 size={18} />}
          onClick={() => openCardDetail("Average Invoice Value", "Invoices used for the average.", report.referredInvoices)} />
      </div>

      {/* minmax(0,1fr) + min-w-0: warna table ki nowrap cells grid ko chauda karke poora page side-scroll karwati thi. */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <GlassCard className="min-w-0 p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Performance</p>
              <h3 className="mt-2 fs-18 font-semibold text-slate-950">Referrer performance</h3>
            </div>
            <p className="text-sm text-slate-500">Highest revenue first · click a row for invoices</p>
          </div>
          <Table
            data={report.users}
            minHeightClass="min-h-0"
            emptyText={loading ? "Loading..." : "No referred invoices in this range. Pick a user in “Refer By” while creating an invoice."}
            columns={[
              {
                key: "user",
                header: "Referrer",
                render: (user) => (
                  <button type="button" className="text-left" onClick={() => setSelectedUser(user)}>
                    <span className="block whitespace-nowrap font-semibold text-slate-950 hover:text-[var(--theme-color)]">{user.userName}</span>
                    <span className="block fs-12 text-slate-500">{loginOf(user)}</span>
                  </button>
                )
              },
              { key: "invoices", header: "Invoices", className: "text-right", render: (user) => <span className="block text-right tabular-nums">{user.totalInvoices}</span> },
              { key: "revenue", header: "Revenue", className: "text-right", render: (user) => <span className="block whitespace-nowrap text-right font-semibold text-slate-950">{formatCurrency(user.totalRevenue)}</span> },
              { key: "paid", header: "Collected", className: "text-right", render: (user) => <span className="block whitespace-nowrap text-right">{formatCurrency(user.paidRevenue)}</span> },
              { key: "due", header: "Outstanding", className: "text-right", render: (user) => <span className={`block whitespace-nowrap text-right ${Number(user.outstandingRevenue) > 0 ? "font-semibold text-rose-600" : "text-slate-500"}`}>{formatCurrency(user.outstandingRevenue)}</span> }
            ]}
          />
        </GlassCard>

        <GlassCard className="p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Ranking</p>
              <h3 className="mt-2 fs-18 font-semibold text-slate-950">Top contributors</h3>
            </div>
            {report.users.length > 0 ? <Button type="button" variant="secondary" onClick={() => setRankingOpen(true)}><Trophy size={15} />Full ranking</Button> : null}
          </div>
          {report.topContributors.length ? (
            <>
              <ol className="space-y-4">
                {report.topContributors.map((user, index) => {
                  const revenue = Number(user.totalRevenue ?? 0);
                  const paid = Math.min(revenue, Math.max(0, Number(user.paidRevenue ?? 0)));
                  const widthPct = maxUserRevenue > 0 ? Math.max(4, (revenue / maxUserRevenue) * 100) : 0;
                  const paidPct = revenue > 0 ? (paid / revenue) * 100 : 0;
                  return (
                    <li key={user.userId}>
                      <button type="button" className="w-full text-left" title={`${user.userName}: ${formatCurrency(revenue)} · collected ${formatCurrency(paid)}`} onClick={() => setSelectedUser(user)}>
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="flex min-w-0 items-baseline gap-2">
                            <span className={`w-5 shrink-0 fs-11 font-bold tabular-nums ${index === 0 ? "text-amber-500" : "text-slate-400"}`}>{index === 0 ? <Trophy size={13} className="inline" /> : index + 1}</span>
                            <span className="truncate fs-13 font-semibold text-slate-800">{user.userName}</span>
                            <span className="shrink-0 fs-11 text-slate-400">{user.totalInvoices} inv</span>
                          </p>
                          <span className="shrink-0 fs-13 font-bold tabular-nums text-slate-950">{formatCurrency(revenue)}</span>
                        </div>
                        {/* Lambai = revenue (sabse bade ke hisaab se); andar collected vs pending. */}
                        <div className="ml-7 mt-1.5 h-2 rounded-full bg-slate-100">
                          <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${widthPct}%` }}>
                            <div className="h-full" style={{ width: `${paidPct}%`, background: colors.collected }} />
                            {paidPct > 0 && paidPct < 100 ? <div className="h-full w-0.5 bg-white" /> : null}
                            <div className="h-full flex-1" style={{ background: paidPct < 100 ? colors.due : "transparent" }} />
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-3 fs-12 text-slate-600">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.collected }} />Collected</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors.due }} />Outstanding</span>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{loading ? "Loading..." : "No contributors in this range."}</p>
          )}
        </GlassCard>
      </div>

      <Modal open={Boolean(selectedUser)} title={selectedUser ? `${selectedUser.userName} · Referral Details` : "Referral Details"} onClose={() => setSelectedUser(null)}>
        {selectedUser ? <UserDetail user={selectedUser} /> : null}
      </Modal>

      <Modal open={Boolean(cardDetail)} title={cardDetail?.title ?? "Details"} onClose={() => setCardDetail(null)}>
        <InvoiceDrilldown description={cardDetail?.description ?? ""} invoices={cardDetail?.invoices ?? []} />
      </Modal>

      <Modal open={rankingOpen} title="Complete Sales Contributor Ranking" onClose={() => setRankingOpen(false)}>
        <RankingDrilldown users={report.users} onSelectUser={(user) => { setRankingOpen(false); setSelectedUser(user); }} />
      </Modal>
    </div>
  );
};

// Modals: baaki app jaisi common Table (pehle card-style bade rows the, ajeeb lagte the).
const UserDetail = ({ user }: { user: SalesReferralUserSummary }) => {
  const revenue = Number(user.totalRevenue ?? 0);
  const paidPct = revenue > 0 ? Math.round((Number(user.paidRevenue ?? 0) / revenue) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryMini label="Invoices" value={String(user.totalInvoices)} />
        <SummaryMini label="Revenue" value={formatCurrency(user.totalRevenue)} />
        <SummaryMini label="Collected" value={formatCurrency(user.paidRevenue)} hint={revenue > 0 ? `${paidPct}% of revenue` : undefined} />
        <SummaryMini label="Outstanding" value={formatCurrency(user.outstandingRevenue)} danger={Number(user.outstandingRevenue) > 0} />
      </div>
      <InvoiceDrilldown description="" invoices={user.invoices} hideReferrer />
    </div>
  );
};

const InvoiceDrilldown = ({ description, invoices, hideReferrer = false }: { description: string; invoices: SalesReferralInvoice[]; hideReferrer?: boolean }) => {
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
          [invoice.invoiceNo, invoice.customerName, invoice.referByUserName, invoice.invoiceDate].some((value) => String(value ?? "").toLowerCase().includes(query))
        )
      : invoices;
    return [...rows].sort((left, right) => compareInvoices(left, right, sort));
  }, [invoices, search, sort]);

  const totalPages = Math.ceil(filtered.length / REFERRAL_MODAL_PAGE_SIZE);
  const pagedInvoices = filtered.slice(page * REFERRAL_MODAL_PAGE_SIZE, page * REFERRAL_MODAL_PAGE_SIZE + REFERRAL_MODAL_PAGE_SIZE);
  const total = filtered.reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const due = filtered.reduce((sum, invoice) => sum + Number(invoice.outstandingAmount ?? 0), 0);

  return (
    <div className="space-y-3">
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoice, customer or referrer"
            aria-label="Search invoices"
            className="h-10 w-full rounded-[var(--radius-control)] border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)]"
          />
        </label>
        <div className="w-48">
          <Select
            value={sort}
            placeholder={null}
            aria-label="Sort invoices"
            options={[
              { label: "Newest first", value: "dateDesc" },
              { label: "Highest amount", value: "amountDesc" },
              { label: "Highest paid", value: "paidDesc" },
              { label: "Highest outstanding", value: "outstandingDesc" },
              { label: "Invoice number", value: "invoiceNoAsc" }
            ]}
            onChange={(event) => setSort(event.target.value as InvoiceSort)}
          />
        </div>
      </div>
      <Table
        data={pagedInvoices}
        minHeightClass="min-h-0"
        emptyText="No invoices found."
        columns={[
          {
            key: "invoice",
            header: "Invoice",
            render: (invoice) => (
              <div className="whitespace-nowrap">
                <Link to={`/invoices/${invoice.invoiceId}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-950 hover:text-[var(--theme-color)] hover:underline">{invoice.invoiceNo}</Link>
                <p className="mt-0.5 fs-12 text-slate-500">{formatDate(invoice.invoiceDate)}</p>
              </div>
            )
          },
          { key: "customer", header: "Customer", render: (invoice) => <span className="whitespace-nowrap">{invoice.customerName}</span> },
          ...(hideReferrer ? [] : [{
            key: "referrer",
            header: "Referred by",
            render: (invoice: SalesReferralInvoice) => (
              <div className="whitespace-nowrap">
                <p className="text-slate-800">{invoice.referByUserName ?? "--"}</p>
                {invoice.referByUserMobileNumber ? <p className="mt-0.5 fs-12 text-slate-500">{invoice.referByUserMobileNumber}</p> : null}
              </div>
            )
          }]),
          { key: "amount", header: "Amount", className: "text-right", render: (invoice) => <span className="block whitespace-nowrap text-right font-semibold text-slate-950">{formatCurrency(invoice.amount)}</span> },
          { key: "paid", header: "Paid", className: "text-right", render: (invoice) => <span className="block whitespace-nowrap text-right">{formatCurrency(invoice.paidAmount)}</span> },
          { key: "due", header: "Outstanding", className: "text-right", render: (invoice) => <span className={`block whitespace-nowrap text-right ${Number(invoice.outstandingAmount) > 0 ? "font-semibold text-rose-600" : "text-slate-500"}`}>{formatCurrency(invoice.outstandingAmount)}</span> }
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filtered.length} invoice{filtered.length === 1 ? "" : "s"} · <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
          {due > 0 ? <> · <span className="font-semibold text-rose-600">{formatCurrency(due)} due</span></> : null}
        </p>
        {totalPages > 1 ? <Pagination page={page} size={REFERRAL_MODAL_PAGE_SIZE} totalRecords={filtered.length} totalPages={totalPages} onPageChange={setPage} layout="inline" /> : null}
      </div>
    </div>
  );
};

const RankingDrilldown = ({ users, onSelectUser }: { users: SalesReferralUserSummary[]; onSelectUser: (user: SalesReferralUserSummary) => void }) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [search, users]);

  const ranked = useMemo(
    () => [...users].sort((left, right) => Number(right.totalRevenue ?? 0) - Number(left.totalRevenue ?? 0)).map((user, index) => ({ ...user, rank: index + 1 })),
    [users]
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ranked.filter((user) => !query || [user.userName, loginOf(user)].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [search, ranked]);
  const totalPages = Math.ceil(filtered.length / REFERRAL_MODAL_PAGE_SIZE);
  const pagedUsers = filtered.slice(page * REFERRAL_MODAL_PAGE_SIZE, page * REFERRAL_MODAL_PAGE_SIZE + REFERRAL_MODAL_PAGE_SIZE);

  return (
    <div className="space-y-3">
      <label className="relative block md:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search referrer"
          aria-label="Search referrer"
          className="h-10 w-full rounded-[var(--radius-control)] border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)]"
        />
      </label>
      <Table
        data={pagedUsers}
        minHeightClass="min-h-0"
        emptyText="No contributors found."
        columns={[
          { key: "rank", header: "#", render: (user) => <span className={`font-bold tabular-nums ${user.rank === 1 ? "text-amber-500" : "text-slate-400"}`}>{user.rank === 1 ? <Trophy size={14} /> : user.rank}</span> },
          {
            key: "user",
            header: "Referrer",
            render: (user) => (
              <button type="button" className="text-left" onClick={() => onSelectUser(user)}>
                <span className="block whitespace-nowrap font-semibold text-slate-950 hover:text-[var(--theme-color)]">{user.userName}</span>
                {loginOf(user) ? <span className="block fs-12 text-slate-500">{loginOf(user)}</span> : null}
              </button>
            )
          },
          { key: "invoices", header: "Invoices", className: "text-right", render: (user) => <span className="block text-right tabular-nums">{user.totalInvoices}</span> },
          { key: "revenue", header: "Revenue", className: "text-right", render: (user) => <span className="block whitespace-nowrap text-right font-semibold text-slate-950">{formatCurrency(user.totalRevenue)}</span> },
          { key: "paid", header: "Collected", className: "text-right", render: (user) => <span className="block whitespace-nowrap text-right">{formatCurrency(user.paidRevenue)}</span> },
          { key: "avg", header: "Avg invoice", className: "text-right", render: (user) => <span className="block whitespace-nowrap text-right text-slate-600">{formatCurrency(user.averageInvoiceValue)}</span> }
        ]}
      />
      {totalPages > 1 ? <div className="flex justify-end"><Pagination page={page} size={REFERRAL_MODAL_PAGE_SIZE} totalRecords={filtered.length} totalPages={totalPages} onPageChange={setPage} layout="inline" /></div> : null}
    </div>
  );
};

const SummaryMini = ({ label, value, hint, danger = false }: { label: string; value: string; hint?: string; danger?: boolean }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="fs-11 font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className={`mt-1 fs-16 font-bold tabular-nums ${danger ? "text-rose-600" : "text-slate-950"}`}>{value}</p>
    {hint ? <p className="mt-0.5 fs-12 text-slate-500">{hint}</p> : null}
  </div>
);

const loginOf = (user: SalesReferralUserSummary) => user.loginName ?? user.username ?? "";

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

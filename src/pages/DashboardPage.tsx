import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { getDashboardDetails, getDashboardSummary } from "../api/dashboard";
import { getInvoices } from "../api/invoices";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { formatAmount, formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { DashboardCardKey, DashboardDetail, DashboardDetailRow, DashboardSummary, Invoice } from "../types/api";

type DatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

type DetailColumn = {
  key: string;
  header: string;
  type?: "currency" | "date" | "status";
  sortable?: boolean;
};

const detailConfig: Record<DashboardCardKey, { title: string; columns: DetailColumn[]; defaultSort: string }> = {
  totalSales: {
    title: "Total Sales Details",
    defaultSort: "invoiceDate",
    columns: [
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "productName", header: "Product/Item Name", sortable: true },
      { key: "quantity", header: "Quantity", sortable: true },
      { key: "totalAmount", header: "Total Amount", type: "currency", sortable: true },
      { key: "invoiceDate", header: "Invoice Date", type: "date", sortable: true }
    ]
  },
  collections: {
    title: "Collections Details",
    defaultSort: "paymentDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "collectedAmount", header: "Collected Amount", type: "currency", sortable: true },
      { key: "paymentDate", header: "Payment Date", type: "date", sortable: true },
      { key: "paymentMethod", header: "Payment Method", sortable: true }
    ]
  },
  outstanding: {
    title: "Outstanding Details",
    defaultSort: "dueDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "invoiceAmount", header: "Invoice Amount", type: "currency", sortable: true },
      { key: "paidAmount", header: "Paid Amount", type: "currency", sortable: true },
      { key: "outstandingAmount", header: "Outstanding Amount", type: "currency", sortable: true },
      { key: "dueDate", header: "Due Date", type: "date", sortable: true }
    ]
  },
  newCustomers: {
    title: "New Customers Details",
    defaultSort: "firstPurchaseDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "firstPurchaseDate", header: "First Purchase Date", type: "date", sortable: true },
      { key: "invoiceCount", header: "Invoice Count", sortable: true },
      { key: "totalPurchaseAmount", header: "Total Purchase Amount", type: "currency", sortable: true }
    ]
  },
  existingCustomers: {
    title: "Existing Customers Details",
    defaultSort: "lastPurchaseDate",
    columns: [
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "customerCreatedDate", header: "Customer Created Date", type: "date", sortable: true },
      { key: "lastPurchaseDate", header: "Last Purchase Date", type: "date", sortable: true },
      { key: "invoiceCount", header: "Invoice Count", sortable: true },
      { key: "totalPurchaseAmount", header: "Total Purchase Amount", type: "currency", sortable: true },
      { key: "outstandingAmount", header: "Outstanding Amount", type: "currency", sortable: true }
    ]
  },
  invoices: {
    title: "Invoice Details",
    defaultSort: "invoiceDate",
    columns: [
      { key: "invoiceNo", header: "Invoice No", sortable: true },
      { key: "customerName", header: "Customer Name", sortable: true },
      { key: "invoiceDate", header: "Invoice Date", type: "date", sortable: true },
      { key: "invoiceAmount", header: "Invoice Amount", type: "currency", sortable: true },
      { key: "status", header: "Status", type: "status", sortable: true }
    ]
  }
};

const formatCell = (row: DashboardDetailRow, column: DetailColumn) => {
  const value = row[column.key];
  if (column.type === "currency") {
    return formatAmount(Number(value ?? 0));
  }
  if (column.type === "date") {
    return formatDate(String(value ?? ""));
  }
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return String(value).replace(/_/g, " ");
};

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

const buildRange = (preset: DatePreset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toIso = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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

export const DashboardPage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [preset, setPreset] = useState<DatePreset>("thisMonth");
  const [customRange, setCustomRange] = useState(() => buildRange("thisMonth"));
  const [activeCard, setActiveCard] = useState<DashboardCardKey | null>(null);
  const [details, setDetails] = useState<DashboardDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(0);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailSort, setDetailSort] = useState<{ sortBy: string; sortDirection: "asc" | "desc" }>({
    sortBy: "date",
    sortDirection: "desc"
  });

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);
  const selectedConfig = activeCard ? detailConfig[activeCard] : null;
  const dashboardCards = useMemo(
    () =>
      [
        {
          key: "totalSales" as const,
          label: "Total Sales",
          value: formatCurrency(summary?.totalSales),
          caption: "Invoiced sales in the selected period."
        },
        {
          key: "collections" as const,
          label: "Collections",
          value: formatCurrency(summary?.totalCollection),
          caption: "Payments recorded during the selected range."
        },
        {
          key: "outstanding" as const,
          label: "Outstanding",
          value: formatCurrency(summary?.outstandingAmount),
          caption: "Current total pending customer balance."
        },
        {
          key: "newCustomers" as const,
          label: "New Customers",
          value: String(summary?.newCustomers ?? 0),
          caption: "First purchase happened inside this range."
        },
        {
          key: "existingCustomers" as const,
          label: "Existing Customers",
          value: String(summary?.existingCustomers ?? 0),
          caption: "Earlier customers who purchased in this range.",
          hideWhenZero: true,
          count: summary?.existingCustomers ?? 0
        },
        {
          key: "invoices" as const,
          label: "Invoices",
          value: String(summary?.totalInvoices ?? 0),
          caption: "Invoices issued during the selected range.",
          hideWhenZero: true,
          count: summary?.totalInvoices ?? 0
        }
      ].filter((card) => !card.hideWhenZero || card.count > 0),
    [summary]
  );

  useEffect(() => {
    void Promise.all([
      getDashboardSummary(activeRange),
      getInvoices({ size: 100 })
    ]).then(([summaryData, invoicesData]) => {
      setSummary(summaryData);
      const filtered = invoicesData.filter((invoice) => {
        if (activeRange.startDate && invoice.invoiceDate < activeRange.startDate) {
          return false;
        }
        return !(activeRange.endDate && invoice.invoiceDate > activeRange.endDate);
      });
      setRecentInvoices(filtered.slice(0, 5));
    });
  }, [activeRange]);

  useEffect(() => {
    if (!activeCard) {
      return;
    }
    setDetailsLoading(true);
    void getDashboardDetails({
      card: activeCard,
      ...activeRange,
      page: detailPage,
      size: DEFAULT_PAGE_SIZE,
      sortBy: detailSort.sortBy,
      sortDirection: detailSort.sortDirection,
      search: detailSearch || undefined
    })
      .then(setDetails)
      .finally(() => setDetailsLoading(false));
  }, [activeCard, activeRange, detailPage, detailSearch, detailSort]);

  const openDetails = (card: DashboardCardKey) => {
    setActiveCard(card);
    setDetails(null);
    setDetailPage(0);
    setDetailSearch("");
    setDetailSort({ sortBy: detailConfig[card].defaultSort, sortDirection: "desc" });
  };

  const toggleSort = (column: DetailColumn) => {
    if (!column.sortable) {
      return;
    }
    setDetailPage(0);
    setDetailSort((current) => ({
      sortBy: column.key,
      sortDirection: current.sortBy === column.key && current.sortDirection === "desc" ? "asc" : "desc"
    }));
  };

  const exportDetails = () => {
    if (!selectedConfig || !details) {
      return;
    }
    const lines = [
      selectedConfig.columns.map((column) => escapeCsv(column.header)).join(","),
      ...details.rows.map((row) => selectedConfig.columns.map((column) => escapeCsv(formatCell(row, column))).join(","))
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${details.card}-dashboard-details.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Dashboard"
        subtitle="Track sales, collections, open balances, and customer performance with date-based business visibility."
      />

      <GlassCard className="p-6 md:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Filters</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Dashboard range</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["today", "Today"],
              ["yesterday", "Yesterday"],
              ["thisWeek", "This Week"],
              ["thisMonth", "This Month"],
              ["thisYear", "This Year"],
              ["custom", "Custom Range"]
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={preset === value ? "primary" : "secondary"}
                onClick={() => setPreset(value as DatePreset)}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardCards.map((card) => (
          <StatCard key={card.key} label={card.label} value={card.value} caption={card.caption} onClick={() => openDetails(card.key)} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Recent invoices</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Billing activity</h2>
            </div>
            <p className="text-sm text-slate-400">{recentInvoices.length} invoice{recentInvoices.length === 1 ? "" : "s"}</p>
          </div>
          <Table
            data={recentInvoices}
            emptyText="No invoices fall within the selected range."
            columns={[
              { key: "invoice", header: "Invoice", render: (item) => <span className="font-semibold text-white">{item.invoiceNo}</span> },
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
              { key: "date", header: "Date", render: (item) => formatDate(item.invoiceDate) },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.paymentStatus} /> },
              {
                key: "balance",
                header: "Balance",
                className: "text-right",
                render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.balanceAmount)}</span>
              }
            ]}
          />
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top customers</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Highest sales contribution</h2>
          </div>
          <div className="space-y-3">
            {summary?.topCustomers?.length ? (
              summary.topCustomers.map((customer) => (
                <div key={customer.customerId} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{customer.customerName}</p>
                      <p className="mt-1 text-sm text-slate-400">{customer.mobile}</p>
                      <p className="mt-2 text-xs text-slate-500">Last purchase: {formatDate(customer.lastPurchaseDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sales</p>
                      <p className="mt-1 font-semibold text-white">{formatCurrency(customer.totalPurchaseAmount)}</p>
                      <p className="mt-2 text-xs text-slate-400">Paid: {formatCurrency(customer.totalPaidAmount)}</p>
                      <p className="text-xs text-rose-200">Outstanding: {formatCurrency(customer.outstandingBalance)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
                No customer activity found for the selected range.
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <Modal open={Boolean(activeCard)} title={selectedConfig?.title ?? "Dashboard Details"} onClose={() => setActiveCard(null)}>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input
                className="w-full rounded-[var(--radius-control)] border border-white/10 bg-[var(--panel-strong)] py-3 pl-11 pr-4 text-sm font-medium text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
                placeholder="Search details"
                value={detailSearch}
                onChange={(event) => {
                  setDetailPage(0);
                  setDetailSearch(event.target.value);
                }}
              />
            </label>
            <Button type="button" variant="secondary" onClick={exportDetails} disabled={!details?.rows.length}>
              <Download size={17} />
              Export CSV
            </Button>
          </div>

          {activeCard === "totalSales" && details?.productSummary?.length ? (
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Product-wise sales summary</p>
              <Table
                data={details.productSummary}
                columns={[
                  { key: "productName", header: "Product Name", render: (item) => String(item.productName ?? "--") },
                  { key: "quantitySold", header: "Quantity Sold", render: (item) => String(item.quantitySold ?? 0) },
                  { key: "totalRevenue", header: "Total Revenue", render: (item) => formatAmount(Number(item.totalRevenue ?? 0)) },
                  { key: "numberOfInvoices", header: "Number of Invoices", render: (item) => String(item.numberOfInvoices ?? 0) }
                ]}
              />
            </div>
          ) : null}

          <div className="scrollbar-thin overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-200/90">
              <thead>
                <tr>
                  {selectedConfig?.columns.map((column) => (
                    <th key={column.key} className="whitespace-nowrap border-b border-white/10 px-4 pb-3 pt-1 font-medium text-slate-400 first:pl-0 last:pr-0">
                      <button type="button" className="text-left" onClick={() => toggleSort(column)}>
                        {column.header}
                        {detailSort.sortBy === column.key ? ` ${detailSort.sortDirection}` : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailsLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-400" colSpan={selectedConfig?.columns.length ?? 1}>Loading details...</td>
                  </tr>
                ) : details?.rows.length ? (
                  details.rows.map((row, index) => (
                    <tr key={index} className="group">
                      {selectedConfig?.columns.map((column) => (
                        <td key={column.key} className="border-b border-white/5 px-4 py-4 align-top first:pl-0 last:pr-0 group-last:border-b-0">
                          {column.type === "status" ? <StatusBadge label={formatCell(row, column)} /> : formatCell(row, column)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-400" colSpan={selectedConfig?.columns.length ?? 1}>No details found for this card.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {details ? (
            <Pagination
              page={details.page}
              size={details.size}
              totalRecords={details.totalElements}
              totalPages={details.totalPages}
              disabled={detailsLoading}
              onPageChange={setDetailPage}
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

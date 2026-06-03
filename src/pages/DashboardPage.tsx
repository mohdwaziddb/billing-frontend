import { useEffect, useMemo, useState } from "react";
import { getDashboardSummary } from "../api/dashboard";
import { getInvoices } from "../api/invoices";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { DashboardSummary, Invoice } from "../types/api";

type DatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

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

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);

  useEffect(() => {
    void Promise.all([
      getDashboardSummary(activeRange),
      getInvoices()
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Sales" value={formatCurrency(summary?.totalSales)} caption="Invoiced sales in the selected period." />
        <StatCard label="Collections" value={formatCurrency(summary?.totalCollection)} caption="Payments recorded during the selected range." />
        <StatCard label="Outstanding" value={formatCurrency(summary?.outstandingAmount)} caption="Current total pending customer balance." />
        <StatCard label="New Customers" value={String(summary?.newCustomers ?? 0)} caption="Customers added within the selected range." />
        <StatCard label="Invoices" value={String(summary?.totalInvoices ?? 0)} caption="Invoices issued during the selected range." />
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
    </div>
  );
};

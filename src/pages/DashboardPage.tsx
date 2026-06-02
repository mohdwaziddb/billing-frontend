import { useEffect, useState } from "react";
import { getOutstandingCustomers } from "../api/customers";
import { getDashboardSummary } from "../api/dashboard";
import { getInvoices } from "../api/invoices";
import { Header } from "../components/Header";
import { GlassCard } from "../components/GlassCard";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { Customer, DashboardSummary, Invoice } from "../types/api";

export const DashboardPage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [outstandingCustomers, setOutstandingCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    void Promise.all([getDashboardSummary(), getInvoices(), getOutstandingCustomers()]).then(
      ([summaryData, invoicesData, outstandingData]) => {
        setSummary(summaryData);
        setRecentInvoices(invoicesData.slice(0, 5));
        setOutstandingCustomers(outstandingData.slice(0, 5));
      }
    );
  }, []);

  return (
    <div className="space-y-4">
      <Header
        title="Executive dashboard"
        subtitle="Track revenue flow, outstanding balances, and invoice activity from a premium control room built for modern billing teams."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatCurrency(summary?.totalRevenue)} caption="Collected by backend-led payment entries" />
        <StatCard label="Outstanding" value={formatCurrency(summary?.outstandingBalance)} caption="Remaining receivables across customers" />
        <StatCard label="Invoices" value={String(summary?.totalInvoices ?? 0)} caption="Invoices issued through secure APIs" />
        <StatCard label="Products" value={String(summary?.totalProducts ?? 0)} caption="Catalog items managed per company" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Recent invoices</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Latest billing activity</h2>
          </div>
          <Table
            data={recentInvoices}
            columns={[
              { key: "invoice", header: "Invoice", render: (item) => item.invoiceNo },
              { key: "customer", header: "Customer", render: (item) => item.customerName },
              { key: "date", header: "Date", render: (item) => formatDate(item.invoiceDate) },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.paymentStatus} /> },
              { key: "amount", header: "Amount", render: (item) => formatCurrency(item.totalAmount) }
            ]}
          />
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Receivables watch</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Top outstanding customers</h2>
          </div>
          <div className="space-y-3">
            {outstandingCustomers.map((customer) => (
              <div key={customer.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{customer.name}</p>
                    <p className="text-sm text-slate-400">{customer.mobile}</p>
                  </div>
                  <p className="text-sm font-semibold text-rose-200">{formatCurrency(customer.currentBalance)}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

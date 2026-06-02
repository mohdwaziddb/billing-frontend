import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvoice } from "../api/invoices";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { formatCurrency } from "../lib/currency";
import { formatDate, formatDateTime } from "../lib/format";
import type { Invoice } from "../types/api";

export const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }
    void getInvoice(Number(invoiceId)).then(setInvoice);
  }, [invoiceId]);

  return (
    <div className="space-y-4">
      <Header title="Invoice detail" subtitle="View the backend-calculated invoice snapshot, line items, totals, and payment status without trusting frontend math." />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Invoice profile</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{invoice?.invoiceNo ?? "--"}</h2>
            </div>
            {invoice ? <StatusBadge label={invoice.paymentStatus} /> : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Customer</p>
              <p className="mt-2 font-semibold text-white">{invoice?.customerName ?? "--"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Invoice date</p>
              <p className="mt-2 font-semibold text-white">{formatDate(invoice?.invoiceDate)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Created at</p>
              <p className="mt-2 font-semibold text-white">{formatDateTime(invoice?.createdAt)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Created by</p>
              <p className="mt-2 font-semibold text-white">{invoice?.createdBy ?? "--"}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-semibold text-white">{formatCurrency(invoice?.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-slate-400">Tax amount</span>
              <span className="font-semibold text-white">{formatCurrency(invoice?.taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-slate-400">Discount amount</span>
              <span className="font-semibold text-white">{formatCurrency(invoice?.discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <span className="text-cyan-100">Total / Balance</span>
              <span className="font-bold text-white">{formatCurrency(invoice?.totalAmount)} / {formatCurrency(invoice?.balanceAmount)}</span>
            </div>
          </div>
          <div className="mt-6">
            <Link to="/payments/new">
              <Button>Record payment</Button>
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Line items</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Server-calculated breakdown</h2>
          </div>
          <Table
            data={invoice?.items ?? []}
            columns={[
              { key: "product", header: "Product", render: (item) => item.productName },
              { key: "qty", header: "Qty", render: (item) => item.qty },
              { key: "price", header: "Price", render: (item) => formatCurrency(item.price) },
              { key: "discount", header: "Discount %", render: (item) => `${item.discountPercent}%` },
              { key: "tax", header: "Tax %", render: (item) => `${item.taxPercent}%` },
              { key: "lineTotal", header: "Line Total", render: (item) => formatCurrency(item.lineTotal) }
            ]}
          />
        </GlassCard>
      </div>
    </div>
  );
};

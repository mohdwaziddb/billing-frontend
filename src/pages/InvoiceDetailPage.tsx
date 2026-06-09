import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvoice } from "../api/invoices";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { downloadInvoicePdf } from "../lib/invoicePdf";
import { formatCurrency } from "../lib/currency";
import { formatDate, formatDateTime } from "../lib/format";
import type { Invoice } from "../types/api";

export const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const { user, can } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }
    void getInvoice(Number(invoiceId)).then(setInvoice);
  }, [invoiceId]);

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Invoice Details"
        subtitle="Review invoice details, line items, totals, customer information, and download a printable invoice PDF."
      />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Invoice profile</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{invoice?.invoiceNo ?? "--"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {invoice ? <StatusBadge label={invoice.paymentStatus} /> : null}
              {invoice && can("INVOICES", "EXPORT") ? (
                <Button type="button" variant="secondary" onClick={() => downloadInvoicePdf(invoice, user?.company ?? null)}>
                  Download invoice
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Customer</p>
              <p className="mt-2 font-semibold text-white">{invoice?.customerName ?? "--"}</p>
              <p className="mt-1 text-sm text-slate-400">{invoice?.customerMobile ?? "--"}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Invoice date</p>
              <p className="mt-2 font-semibold text-white">{formatDate(invoice?.invoiceDate)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 md:col-span-2">
              <p className="text-sm text-slate-400">Customer address</p>
              <p className="mt-2 font-semibold text-white">{invoice?.customerAddress ?? "--"}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Created at</p>
              <p className="mt-2 font-semibold text-white">{formatDateTime(invoice?.createdAt)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Created by</p>
              <p className="mt-2 font-semibold text-white">{invoice?.createdBy ?? "--"}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Updated at</p>
              <p className="mt-2 font-semibold text-white">{formatDateTime(invoice?.updatedAt)}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Updated by</p>
              <p className="mt-2 font-semibold text-white">{invoice?.updatedBy ?? "--"}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 p-4">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-semibold text-white">{formatCurrency(invoice?.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 p-4">
              <span className="text-slate-400">Discount amount</span>
              <span className="font-semibold text-white">{formatCurrency(invoice?.discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 p-4">
              <span className="text-slate-400">Tax amount</span>
              <span className="font-semibold text-white">{formatCurrency(invoice?.taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-sky-300/20 bg-sky-400/10 p-4">
              <span className="text-sky-100">Grand Total</span>
              <span className="font-bold text-white">{formatCurrency(invoice?.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 p-4">
              <span className="text-slate-400">Paid Amount</span>
              <span className="font-semibold text-white">{formatCurrency(invoice?.paidAmount)}</span>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-rose-300/20 bg-rose-500/10 p-4">
              <span className="text-rose-100">Remaining Balance</span>
              <span className="font-bold text-white">{formatCurrency(invoice?.balanceAmount)}</span>
            </div>
          </div>
          {can("PAYMENTS", "ADD") ? (
            <div className="mt-6">
              <Link to={invoice ? `/payments?invoiceId=${invoice.id}` : "/payments"}>
                <Button>Record payment</Button>
              </Link>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Line items</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Invoice breakdown</h2>
          </div>
          <Table
            data={invoice?.items ?? []}
            columns={[
              { key: "product", header: "Product", render: (item) => item.productName },
              { key: "qty", header: "Qty", className: "text-right", render: (item) => <span className="block text-right">{item.qty}</span> },
              { key: "price", header: "Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.price)}</span> },
              { key: "discount", header: "Discount %", className: "text-right", render: (item) => <span className="block text-right">{item.discountPercent}%</span> },
              { key: "tax", header: "Tax %", className: "text-right", render: (item) => <span className="block text-right">{item.taxPercent}%</span> },
              { key: "lineTotal", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.lineTotal)}</span> }
            ]}
          />
        </GlassCard>
      </div>
    </div>
  );
};

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAuditLogs } from "../api/auditLogs";
import { getInvoiceProfitability } from "../api/expenses";
import { getInvoice } from "../api/invoices";
import { getPayments } from "../api/payments";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { downloadInvoicePdf } from "../lib/invoicePdf";
import { formatCurrency } from "../lib/currency";
import { formatDate, formatDateTime } from "../lib/format";
import type { AuditLog, Invoice, Payment, Profitability } from "../types/api";

export const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const { user, can } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profitability, setProfitability] = useState<Profitability | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      return;
    }
    const id = Number(invoiceId);
    void Promise.all([
      getInvoice(id),
      getPayments({ size: 1000 }).then((rows) => rows.filter((payment) => payment.invoiceId === id)),
      can("EXPENSES", "VIEW") ? getInvoiceProfitability(id) : Promise.resolve(null),
      can("INVOICES", "LOGS") ? getAuditLogs({ moduleName: "Invoice", entityId: id, page: 0, size: 20 }).then((response) => response.records) : Promise.resolve([])
    ]).then(([invoiceData, paymentData, profitabilityData, logData]) => {
      setInvoice(invoiceData);
      setPayments(paymentData);
      setProfitability(profitabilityData);
      setLogs(logData);
    });
  }, [invoiceId]);

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Invoice Details"
        subtitle="Review invoice details, line items, totals, customer information, and download a printable invoice PDF."
      />
      <GlassCard className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-white p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">Invoice Header</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-950">{invoice?.invoiceNo ?? "--"}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">Invoice Date: {formatDate(invoice?.invoiceDate)}</p>
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
        </div>

        <div className="grid gap-6 p-6 md:p-8 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Customer Details</h3>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xl font-extrabold text-slate-950">{invoice?.customerName ?? "--"}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{invoice?.customerMobile ?? "--"}</p>
                <p className="mt-3 text-sm text-slate-500">{invoice?.customerAddress ?? "--"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Outstanding Summary</h3>
              <div className="mt-3 grid gap-3">
                <SummaryRow label="Invoice Amount" value={formatCurrency(invoice?.totalAmount)} />
                <SummaryRow label="Paid Amount" value={formatCurrency(invoice?.paidAmount)} />
                <SummaryRow label="Outstanding Amount" value={formatCurrency(invoice?.balanceAmount)} highlight />
              </div>
              {can("PAYMENTS", "ADD") ? (
                <div className="mt-4">
                  <Link to={invoice ? `/payments?invoiceId=${invoice.id}` : "/payments"}>
                    <Button>Record payment</Button>
                  </Link>
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Invoice Summary</h3>
              <div className="mt-3 grid gap-3">
                <SummaryRow label="Subtotal" value={formatCurrency(invoice?.subtotal)} />
                <SummaryRow label="Product + Invoice Discount" value={formatCurrency(invoice?.discountAmount)} />
                <SummaryRow label="Tax" value={formatCurrency(invoice?.taxAmount)} />
                <SummaryRow label="Grand Total" value={formatCurrency(invoice?.totalAmount)} strong />
              </div>
            </div>

            {profitability ? (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Invoice Profitability</h3>
                <div className="mt-3 grid gap-3">
                  <SummaryRow label="Invoice Amount" value={formatCurrency(profitability.revenue)} />
                  <SummaryRow label="Invoice Expense" value={formatCurrency(profitability.expense)} />
                  <SummaryRow label="Net Revenue" value={formatCurrency(profitability.netRevenue)} strong />
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Product Details</h3>
              <div className="mt-3">
                <Table
                  data={invoice?.items ?? []}
                  columns={[
                    { key: "product", header: "Product", render: (item) => item.productName },
                    { key: "qty", header: "Qty", className: "text-right", render: (item) => <span className="block text-right">{item.qty}</span> },
                    { key: "price", header: "Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.price)}</span> },
                    { key: "discount", header: "Discount", className: "text-right", render: (item) => <span className="block text-right">{item.discountPercent}%</span> },
                    { key: "tax", header: "Tax", className: "text-right", render: (item) => <span className="block text-right">{item.taxPercent}%</span> },
                    { key: "lineTotal", header: "Line Total", className: "text-right", render: (item) => <span className="block text-right font-semibold text-slate-950">{formatCurrency(item.lineTotal)}</span> }
                  ]}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Payment History</h3>
              <div className="mt-3">
                <Table
                  data={payments}
                  emptyText="No payments received for this invoice."
                  columns={[
                    { key: "date", header: "Date", render: (item) => formatDate(item.paymentDate) },
                    { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold text-slate-950">{formatCurrency(item.amount)}</span> },
                    { key: "mode", header: "Mode", render: (item) => item.mode.replace(/_/g, " ") },
                    { key: "user", header: "User", render: (item) => item.createdBy ?? "--" }
                  ]}
                />
              </div>
            </div>
          </section>
        </div>
      </GlassCard>

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-400">Audit Timeline</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Invoice activity</h2>
          </div>
          <p className="text-sm text-slate-400">Created {formatDateTime(invoice?.createdAt)} by {invoice?.createdBy ?? "--"}</p>
        </div>
        <div className="space-y-3">
          {logs.length ? logs.map((log) => <TimelineRow key={log.id} log={log} />) : <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">No audit timeline available.</p>}
        </div>
      </GlassCard>
    </div>
  );
};

const SummaryRow = ({ label, value, strong = false, highlight = false }: { label: string; value: string; strong?: boolean; highlight?: boolean }) => (
  <div className={`flex items-center justify-between rounded-2xl border p-4 ${highlight ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
    <span className="text-sm font-medium text-slate-500">{label}</span>
    <span className={`${strong || highlight ? "text-lg font-extrabold" : "font-bold"} ${highlight ? "text-rose-700" : "text-slate-950"}`}>{value}</span>
  </div>
);

const TimelineRow = ({ log }: { log: AuditLog }) => {
  const data = parseLogData(log.changedFields) ?? parseLogData(log.newData);
  const label = log.actionType === "CREATE" ? "Invoice Created" : log.actionType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold text-white">{label}</p>
          <p className="mt-1 text-sm text-slate-400">{formatDateTime(log.createdAt)} | {log.userName ?? "--"}</p>
        </div>
        {"paymentAmount" in data ? <span className="font-bold text-emerald-200">{formatCurrency(Number(data.paymentAmount))}</span> : null}
      </div>
      {"oldOutstanding" in data || "newOutstanding" in data ? (
        <p className="mt-3 text-sm text-slate-300">Outstanding: {formatCurrency(Number(data.oldOutstanding ?? 0))} to {formatCurrency(Number(data.newOutstanding ?? 0))}</p>
      ) : null}
    </div>
  );
};

const parseLogData = (value: string | null) => {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
};

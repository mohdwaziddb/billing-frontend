import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, Clock3, CreditCard, Download, ReceiptText, UserRound, Wallet } from "lucide-react";
import { getAuditLogs } from "../api/auditLogs";
import { getInvoiceProfitability } from "../api/expenses";
import { getInvoice } from "../api/invoices";
import { getPayments } from "../api/payments";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/currency";
import { formatDate, formatDateTime } from "../lib/format";
import { downloadInvoicePdf } from "../lib/invoicePdf";
import type { AuditLog, Invoice, Payment, Profitability } from "../types/api";

export const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const { user, can } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profitability, setProfitability] = useState<Profitability | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
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
  }, [can, invoiceId]);

  const canRecordPayment = Boolean(invoice && invoice.paymentStatus !== "PAID" && Number(invoice.balanceAmount) > 0 && can("PAYMENTS", "ADD"));

  return (
    <div className="space-y-4 pb-6">
      <Header title="Invoice Details" subtitle="Professional invoice view with payment history, status timeline, and outstanding tracking." />

      <GlassCard className="p-5 md:p-7">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Invoices", to: "/invoices" }, { label: "Invoice Details" }]} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black text-slate-950">{invoice?.invoiceNo ?? "--"}</h2>
              {invoice ? <StatusBadge label={invoice.paymentStatus} /> : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">Invoice Date: {formatDate(invoice?.invoiceDate)} | Created by {invoice?.createdBy ?? "--"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRecordPayment ? (
              <Link to={`/payments/new?invoiceId=${invoice?.id}`}>
                <Button type="button"><CreditCard size={16} />Record Payment</Button>
              </Link>
            ) : null}
            {invoice && can("INVOICES", "EXPORT") ? (
              <Button type="button" variant="secondary" onClick={() => downloadInvoicePdf(invoice, user?.company ?? null)}>
                <Download size={16} />Download Invoice
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InfoPanel icon={<Building2 size={18} />} title="Company Details">
            <p className="font-extrabold text-slate-950">{user?.company?.name ?? "--"}</p>
            <p>{user?.company?.email ?? "--"}</p>
            <p>{user?.company?.phone ?? "--"}</p>
          </InfoPanel>
          <InfoPanel icon={<UserRound size={18} />} title="Customer Details">
            <p className="font-extrabold text-slate-950">{invoice?.customerName ?? "--"}</p>
            <p>{invoice?.customerMobile ?? "--"}</p>
            <p>{invoice?.customerAddress ?? "--"}</p>
          </InfoPanel>
          <InfoPanel icon={<Wallet size={18} />} title="Payment Summary">
            <SummaryLine label="Total" value={formatCurrency(invoice?.totalAmount)} />
            <SummaryLine label="Paid" value={formatCurrency(invoice?.paidAmount)} />
            <SummaryLine label="Outstanding" value={formatCurrency(invoice?.balanceAmount)} danger />
          </InfoPanel>
        </div>
      </GlassCard>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <GlassCard className="p-5 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <ReceiptText size={20} className="text-[var(--theme-color)]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Line Items</p>
              <h3 className="text-xl font-extrabold text-slate-950">Invoice summary</h3>
            </div>
          </div>
          <Table data={invoice?.items ?? []} columns={[
            { key: "product", header: "Product", render: (item) => <span className="font-semibold">{item.productName}</span> },
            { key: "qty", header: "Qty", className: "text-right", render: (item) => <span className="block text-right">{item.qty}</span> },
            { key: "price", header: "Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.price)}</span> },
            { key: "tax", header: "Tax", className: "text-right", render: (item) => <span className="block text-right">{item.taxPercent}%</span> },
            { key: "lineTotal", header: "Total", className: "text-right", render: (item) => <span className="block text-right font-bold text-slate-950">{formatCurrency(item.lineTotal)}</span> }
          ]} />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryBox label="Subtotal" value={formatCurrency(invoice?.subtotal)} />
            <SummaryBox label="Discount" value={formatCurrency(invoice?.discountAmount)} />
            <SummaryBox label="Tax" value={formatCurrency(invoice?.taxAmount)} />
            <SummaryBox label="Grand Total" value={formatCurrency(invoice?.totalAmount)} strong />
          </div>
        </GlassCard>

        <GlassCard className="p-5 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <Clock3 size={20} className="text-[var(--theme-color)]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Status Timeline</p>
              <h3 className="text-xl font-extrabold text-slate-950">Activity</h3>
            </div>
          </div>
          <div className="space-y-3">
            {logs.length ? logs.map((log) => <TimelineRow key={log.id} log={log} />) : <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No audit timeline available.</p>}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <GlassCard className="p-5 md:p-7">
          <h3 className="mb-4 text-xl font-extrabold text-slate-950">Payment History</h3>
          <Table data={payments} emptyText="No payments received for this invoice." columns={[
            { key: "date", header: "Date", render: (item) => formatDate(item.paymentDate) },
            { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-bold text-slate-950">{formatCurrency(item.amount)}</span> },
            { key: "mode", header: "Mode", render: (item) => item.mode.replace(/_/g, " ") },
            { key: "user", header: "Collected By", render: (item) => item.createdBy ?? "--" }
          ]} />
        </GlassCard>

        {profitability ? (
          <GlassCard className="p-5 md:p-7">
            <h3 className="mb-4 text-xl font-extrabold text-slate-950">Profitability</h3>
            <div className="space-y-3">
              <SummaryBox label="Revenue" value={formatCurrency(profitability.revenue)} />
              <SummaryBox label="Expense" value={formatCurrency(profitability.expense)} />
              <SummaryBox label="Net Revenue" value={formatCurrency(profitability.netRevenue)} strong />
            </div>
          </GlassCard>
        ) : null}
      </div>
    </div>
  );
};

const InfoPanel = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">{icon}{title}</div>
    <div className="space-y-1 text-sm font-medium text-slate-600">{children}</div>
  </section>
);

const SummaryLine = ({ label, value, danger }: { label: string; value: string; danger?: boolean }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className={`font-extrabold ${danger ? "text-rose-600" : "text-slate-950"}`}>{value}</span>
  </div>
);

const SummaryBox = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
    <p className={`${strong ? "text-xl" : "text-lg"} mt-2 font-black text-slate-950`}>{value}</p>
  </div>
);

const TimelineRow = ({ log }: { log: AuditLog }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="font-bold text-slate-950">{log.actionType.replace(/_/g, " ")}</p>
    <p className="mt-1 text-xs font-semibold text-slate-500">{formatDateTime(log.createdAt)} | {log.userName ?? "--"}</p>
  </div>
);

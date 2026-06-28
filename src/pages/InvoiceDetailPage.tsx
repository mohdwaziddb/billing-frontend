import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, CreditCard, Printer, ReceiptText, Send, UserRound, Wallet } from "lucide-react";
import { getAuditLogs } from "../api/auditLogs";
import { getInvoiceProfitability } from "../api/expenses";
import { getInvoice } from "../api/invoices";
import { downloadInvoicePdfFile, getInvoiceTemplateSettings, renderInvoiceHtml } from "../api/invoiceTemplates";
import { sendEmailNotification, sendWhatsAppNotification } from "../api/notifications";
import { getPayments } from "../api/payments";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { formatDate, formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { AuditLog, Invoice, Payment, Profitability } from "../types/api";

export const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const { user, can } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profitability, setProfitability] = useState<Profitability | null>(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [whatsAppForm, setWhatsAppForm] = useState({
    message: "",
    includePdf: true,
    includeLink: true
  });
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    includePdf: true
  });
  const { setApiError } = useApiMessage();

  useEffect(() => {
    if (!invoiceId) return;
    const id = Number(invoiceId);
    void Promise.all([
      getInvoice(id),
      getInvoiceTemplateSettings().catch(() => null),
      getPayments({ size: 1000 }).then((rows) => rows.filter((payment) => payment.invoiceId === id)),
      can("EXPENSES", "VIEW") ? getInvoiceProfitability(id) : Promise.resolve(null),
      can("INVOICES", "LOGS") ? getAuditLogs({ moduleName: "Invoice", entityId: id, page: 0, size: 20 }).then((response) => response.records) : Promise.resolve([])
    ]).then(([invoiceData, templateSettings, paymentData, profitabilityData, logData]) => {
      setInvoice(invoiceData);
      setSelectedTemplateId(templateSettings?.defaultTemplateId);
      setPayments(paymentData);
      setProfitability(profitabilityData);
      setLogs(logData);
      return renderInvoiceHtml(id, templateSettings?.defaultTemplateId).then((render) => setRenderedHtml(render.html));
    });
  }, [can, invoiceId]);

  const resolveRenderedInvoiceHtml = async () => {
    if (!invoice) {
      return "";
    }
    const render = await renderInvoiceHtml(invoice.id, selectedTemplateId);
    setRenderedHtml(render.html);
    return render.html;
  };

  const canRecordPayment = Boolean(invoice && invoice.paymentStatus !== "PAID" && Number(invoice.balanceAmount) > 0 && can("PAYMENTS", "ADD"));
  const canSendWhatsApp = Boolean(invoice?.customerMobile && can("COMMUNICATION", "WHATSAPP_SEND"));

  useEffect(() => {
    if (!invoice) {
      return;
    }
    setWhatsAppForm({
      message: defaultInvoiceWhatsAppMessage(invoice),
      includePdf: true,
      includeLink: true
    });
    setEmailForm({
      to: invoice.customerEmail ?? user?.company?.email ?? "",
      subject: `Invoice ${invoice.invoiceNo} from ${user?.company?.name ?? "BizFinity"}`,
      includePdf: true
    });
  }, [invoice]);

  const handleSendWhatsApp = async () => {
    if (!invoice || !invoice.customerMobile) {
      return;
    }
    try {
      setSendingWhatsApp(true);
      const message = whatsAppForm.includeLink
        ? `${whatsAppForm.message.trim()}\nInvoice Link: ${window.location.origin}/invoices/${invoice.id}`
        : whatsAppForm.message.trim();
      const attachments = whatsAppForm.includePdf
        ? [{
          fileName: `${invoice.invoiceNo}.pdf`,
          contentType: "application/pdf",
          base64Content: await blobToBase64(await downloadInvoicePdfFile(invoice.id, selectedTemplateId))
        }]
        : [];
      await sendWhatsAppNotification({
        mobileNumbers: [invoice.customerMobile],
        message,
        attachments
      });
      notificationService.showSuccess("Invoice sent on WhatsApp successfully.");
      setWhatsAppOpen(false);
    } catch (error) {
      setApiError(error, "Unable to send invoice on WhatsApp");
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice || !emailForm.to.trim()) {
      return;
    }
    try {
      setSendingEmail(true);
      const attachments = emailForm.includePdf
        ? [{
          fileName: `${invoice.invoiceNo}.pdf`,
          contentType: "application/pdf",
          base64Content: await blobToBase64(await downloadInvoicePdfFile(invoice.id, selectedTemplateId))
        }]
        : [];
      const html = renderedHtml || await resolveRenderedInvoiceHtml();
      await sendEmailNotification({
        toEmails: [emailForm.to.trim()],
        subject: emailForm.subject.trim() || `Invoice ${invoice.invoiceNo}`,
        message: html || `<p>Please find invoice ${invoice.invoiceNo} attached.</p>`,
        attachments
      });
      notificationService.showSuccess("Invoice email sent successfully.");
      setEmailOpen(false);
    } catch (error) {
      setApiError(error, "Unable to send invoice email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) {
      return;
    }
    try {
      const pdfBlob = await downloadInvoicePdfFile(invoice.id, selectedTemplateId);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setApiError(error, "Unable to download invoice PDF");
    }
  };

  const handlePrint = async () => {
    if (!invoice) {
      return;
    }
    try {
      const html = renderedHtml || await resolveRenderedInvoiceHtml();
      if (!html) {
        notificationService.showError("Unable to load invoice for printing right now.");
        return;
      }
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.setAttribute("aria-hidden", "true");
      document.body.appendChild(frame);
      frame.onload = () => {
        window.setTimeout(() => {
          frame.contentWindow?.focus();
          frame.contentWindow?.print();
          window.setTimeout(() => {
            document.body.removeChild(frame);
          }, 1000);
        }, 250);
      };
      const doc = frame.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(frame);
        notificationService.showError("Unable to open print invoice right now.");
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();
    } catch (error) {
      setApiError(error, "Unable to print invoice");
    }
  };

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
            <p className="mt-1 text-sm font-semibold text-slate-500">Refer By: {invoice?.referByUserName ?? invoice?.referByUsername ?? "--"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRecordPayment ? (
              <Link to={`/payments/new?invoiceId=${invoice?.id}`}>
                <Button type="button"><CreditCard size={16} />Record Payment</Button>
              </Link>
            ) : null}
            {invoice ? (
              <Button type="button" variant="secondary" onClick={() => void handlePrint()}>
                <Printer size={16} />Print
              </Button>
            ) : null}
            {invoice && invoice.customerEmail && can("EMAIL_TEMPLATES", "EMAIL_SEND") ? (
              <Button type="button" variant="secondary" onClick={() => setEmailOpen(true)}>
                <Send size={16} />Send Email
              </Button>
            ) : null}
            {canSendWhatsApp ? (
              <Button type="button" variant="secondary" onClick={() => setWhatsAppOpen(true)}>
                <Send size={16} />Send WhatsApp
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InfoPanel icon={<Building2 size={18} />} title="Company Details">
            <p className="font-extrabold text-slate-950">{user?.company?.name ?? "--"}</p>
            <p>{user?.company?.email ?? "--"}</p>
            <p>{user?.company?.phone ?? "--"}</p>
            <p>{user?.company?.state ?? "--"}</p>
          </InfoPanel>
          <InfoPanel icon={<UserRound size={18} />} title="Customer Details">
            <p className="font-extrabold text-slate-950">{invoice?.customerName ?? "--"}</p>
            <p>{invoice?.customerMobile ?? "--"}</p>
            <p>{invoice?.customerAddress ?? "--"}</p>
            <p>{invoice?.customerState ?? "--"}</p>
            <p className="pt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Refer By</p>
            <p>{invoice?.referByUserName ?? "--"}</p>
          </InfoPanel>
          <InfoPanel icon={<Wallet size={18} />} title="Payment Summary">
            <SummaryLine label="Total" value={formatCurrency(invoice?.totalAmount)} />
            <SummaryLine label="Paid" value={formatCurrency(invoice?.paidAmount)} />
            <SummaryLine label="Outstanding" value={formatCurrency(invoice?.balanceAmount)} danger />
          </InfoPanel>
        </div>
      </GlassCard>

      <div className="grid gap-4">
        <GlassCard className="p-5 md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <ReceiptText size={20} className="text-[var(--theme-color)]" />
            <div>
              <h3 className="text-xl font-extrabold text-slate-950">Invoice Items</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Item-wise billing details and invoice totals.</p>
            </div>
          </div>
          <Table data={invoice?.items ?? []} columns={[
            { key: "product", header: "Product", render: (item) => <span className="font-semibold">{item.productName}</span> },
            { key: "hsn", header: "HSN", render: (item) => item.hsnCode ?? "--" },
            { key: "qty", header: "Qty", className: "text-right", render: (item) => <span className="block text-right">{item.qty}</span> },
            { key: "price", header: "Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.price)}</span> },
            { key: "tax", header: "Tax", render: (item) => <span>{item.taxName ?? `${item.taxRate ?? item.taxPercent}%`}</span> },
            { key: "taxableAmount", header: "Taxable", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.taxableAmount ?? 0)}</span> },
            { key: "gstBreakup", header: "GST Breakup", render: (item) => (
              <span className="text-xs font-semibold text-slate-500">
                {(item.igstAmount ?? 0) > 0
                  ? `IGST ${item.igstRate ?? 0}%`
                  : `CGST ${item.cgstRate ?? 0}% + SGST ${item.sgstRate ?? 0}%`}
              </span>
            ) },
            { key: "lineTotal", header: "Total", className: "text-right", render: (item) => <span className="block text-right font-bold text-slate-950">{formatCurrency(item.lineTotal)}</span> }
          ]} />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryBox label="Subtotal" value={formatCurrency(invoice?.subtotal)} />
            <SummaryBox label="Discount" value={formatCurrency(invoice?.discountAmount)} />
            <SummaryBox label="Taxable" value={formatCurrency(invoice?.taxableAmount)} />
            <SummaryBox label={(invoice?.igstTotal ?? 0) > 0 ? "IGST" : "CGST + SGST"} value={(invoice?.igstTotal ?? 0) > 0 ? formatCurrency(invoice?.igstTotal) : `${formatCurrency(invoice?.cgstTotal)} / ${formatCurrency(invoice?.sgstTotal)}`} />
            <SummaryBox label="Grand Total" value={formatCurrency(invoice?.totalAmount)} strong />
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

      <Modal open={whatsAppOpen} title="Send Invoice on WhatsApp" onClose={() => setWhatsAppOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">{invoice?.customerName}</p>
            <p>{invoice?.customerMobile ?? "--"}</p>
            <p className="mt-2">Invoice: {invoice?.invoiceNo ?? "--"}</p>
          </div>
          <label className="block space-y-2">
            <span className="block text-sm font-semibold text-slate-700">Message</span>
            <textarea className="min-h-[148px] w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]" value={whatsAppForm.message} onChange={(event) => setWhatsAppForm((current) => ({ ...current, message: event.target.value }))} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={whatsAppForm.includePdf} onChange={(event) => setWhatsAppForm((current) => ({ ...current, includePdf: event.target.checked }))} />
              Attach invoice PDF
            </label>
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={whatsAppForm.includeLink} onChange={(event) => setWhatsAppForm((current) => ({ ...current, includeLink: event.target.checked }))} />
              Include invoice link
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setWhatsAppOpen(false)}>Cancel</Button>
            <Button type="button" disabled={sendingWhatsApp || !whatsAppForm.message.trim()} onClick={() => void handleSendWhatsApp()}>
              {sendingWhatsApp ? "Sending..." : "Send WhatsApp"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={emailOpen} title="Send Invoice by Email" onClose={() => setEmailOpen(false)}>
        <div className="space-y-4">
          <Input label="Recipient Email" type="email" value={emailForm.to} onChange={(event) => setEmailForm((current) => ({ ...current, to: event.target.value }))} />
          <Input label="Subject" value={emailForm.subject} onChange={(event) => setEmailForm((current) => ({ ...current, subject: event.target.value }))} />
          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={emailForm.includePdf} onChange={(event) => setEmailForm((current) => ({ ...current, includePdf: event.target.checked }))} />
            Attach invoice PDF
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button type="button" disabled={sendingEmail || !emailForm.to.trim()} onClick={() => void handleSendEmail()}>
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const defaultInvoiceWhatsAppMessage = (invoice: Invoice) =>
  `Hello ${invoice.customerName}, your invoice ${invoice.invoiceNo} for Rs. ${Number(invoice.totalAmount).toFixed(2)} is ready. Outstanding amount: Rs. ${Number(invoice.balanceAmount).toFixed(2)}.`;

const blobToBase64 = async (blob: Blob) =>
  await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

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


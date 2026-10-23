import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, CalendarDays, CreditCard, Mail, MessageCircle, Printer, ReceiptText, Smartphone, UserCheck, UserRound, Wallet } from "lucide-react";
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
import { sanitizeHtml } from "../lib/sanitizeHtml";
import { CollectOnlineModal } from "../modules/payments/components/CollectOnlineModal";
import { PaymentTransactionsList } from "../modules/payments/components/PaymentTransactionsList";
import { usePaymentGatewayConfig } from "../modules/payments/hooks/usePaymentGatewayConfig";
import { getInvoiceTransactions } from "../modules/payments/paymentGateway.api";
import type { PaymentTransaction } from "../modules/payments/payment.types";
import { paymentModeDisplay } from "../modules/payments/paymentModeOptions";
import { notificationService } from "../services/notificationService";
import type { AuditLog, Invoice, NotificationLog, Payment, Profitability } from "../types/api";

export const InvoiceDetailPage = () => {
  const { invoiceId } = useParams();
  const { user, can } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [collectOnlineOpen, setCollectOnlineOpen] = useState(false);
  // Online payment success par invoice / payments dobara laao.
  const [reloadKey, setReloadKey] = useState(0);
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
  const { onlineEnabled } = usePaymentGatewayConfig(can("PAYMENTS", "VIEW"));

  useEffect(() => {
    if (!invoiceId) return;
    const id = Number(invoiceId);
    // Invoice badalne par purani requests ka jawab naye page par na likhe.
    let cancelled = false;
    void Promise.all([
      getInvoice(id),
      getInvoiceTemplateSettings().catch(() => null),
      getPayments({ invoiceId: id, size: 1000 }),
      can("PAYMENTS", "VIEW") ? getInvoiceTransactions(id).catch(() => []) : Promise.resolve([]),
      can("EXPENSES", "VIEW") ? getInvoiceProfitability(id) : Promise.resolve(null),
      can("INVOICES", "LOGS") ? getAuditLogs({ moduleName: "Invoice", entityId: id, page: 0, size: 20 }).then((response) => response.records) : Promise.resolve([])
    ]).then(([invoiceData, templateSettings, paymentData, transactionData, profitabilityData, logData]) => {
      if (cancelled) return;
      setInvoice(invoiceData);
      setSelectedTemplateId(templateSettings?.defaultTemplateId);
      setPayments(paymentData);
      setTransactions(transactionData);
      setProfitability(profitabilityData);
      setLogs(logData);
      return renderInvoiceHtml(id, templateSettings?.defaultTemplateId).then((render) => {
        if (!cancelled) setRenderedHtml(render.html);
      });
    }).catch((err: any) => {
      // Pehle .catch nahi tha: ek bhi call fail = khali page, koi message nahi.
      if (!cancelled) setApiError(err, "Unable to load invoice");
    });
    return () => {
      cancelled = true;
    };
  }, [can, invoiceId, reloadKey, setApiError]);

  const resolveRenderedInvoiceHtml = async () => {
    if (!invoice) {
      return "";
    }
    const render = await renderInvoiceHtml(invoice.id, selectedTemplateId);
    setRenderedHtml(render.html);
    return render.html;
  };

  const canRecordPayment = Boolean(invoice && invoice.paymentStatus !== "PAID" && Number(invoice.balanceAmount) > 0 && can("PAYMENTS", "ADD"));
  const canCollectOnline = canRecordPayment && onlineEnabled;
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
      subject: `Invoice ${invoice.invoiceNo} from ${user?.company?.name ?? "Bizio"}`,
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
        ? [await buildInvoiceAttachment(invoice, selectedTemplateId)]
        : [];
      const sentLogs: NotificationLog[] = await sendWhatsAppNotification({
        mobileNumbers: [invoice.customerMobile],
        message,
        attachments
      });
      // PENDING/FAILED (e.g. WhatsApp provider not configured) must not show
      // as success — surface the backend provider message instead.
      if (!sentLogs.length || sentLogs.every((log) => log.status !== "SENT")) {
        throw new Error(sentLogs[0]?.providerResponse ?? "Invoice could not be sent on WhatsApp.");
      }
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
        ? [await buildInvoiceAttachment(invoice, selectedTemplateId)]
        : [];
      const message = emailForm.includePdf
        ? `<p>Please find invoice ${invoice.invoiceNo} attached.</p>`
        : renderedHtml || await resolveRenderedInvoiceHtml();
      const sentLogs: NotificationLog[] = await sendEmailNotification({
        toEmails: [emailForm.to.trim()],
        subject: emailForm.subject.trim() || `Invoice ${invoice.invoiceNo}`,
        message,
        attachments
      });
      // PENDING/FAILED (e.g. email provider not configured) must not show as
      // success — surface the backend provider message instead.
      if (!sentLogs.length || sentLogs.every((log) => log.status !== "SENT")) {
        throw new Error(sentLogs[0]?.providerResponse ?? "Invoice email could not be sent.");
      }
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
      link.download = invoicePdfFileName(invoice);
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
      // Sanitize server-rendered HTML before document.write so a compromised
      // template cannot execute scripts in the app origin during printing.
      // allowStyle: first-party template.css must survive, else print is unstyled.
      doc.open();
      doc.write(sanitizeHtml(html, { allowStyle: true }));
      doc.close();
    } catch (error) {
      setApiError(error, "Unable to print invoice");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Invoice Details" subtitle="Professional invoice view with payment history, status timeline, and outstanding tracking." />

      <GlassCard className="p-5 md:p-7">
        <div className="mb-6 space-y-4">
          <CommonBreadcrumb items={[{ label: "Invoices", to: "/invoices" }, { label: "Invoice Details" }]} />
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="fs-24 break-all font-bold text-slate-950">{invoice?.invoiceNo ?? "--"}</h2>
                {invoice ? <StatusBadge label={invoice.paymentStatus} /> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} className="text-slate-400" />
                  {formatDate(invoice?.invoiceDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={15} className="text-slate-400" />
                  Created by <span className="font-semibold text-slate-700">{invoice?.createdBy ?? "--"}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck size={15} className="text-slate-400" />
                  Refer by <span className="font-semibold text-slate-700">{invoice?.referByUserName ?? invoice?.referByUsername ?? "--"}</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:shrink-0 xl:justify-end">
              {canRecordPayment || canCollectOnline ? (
                <div className="flex flex-wrap items-center gap-2">
                  {canRecordPayment ? (
                    <Link to={`/payments/new?invoiceId=${invoice?.id}`}>
                      <Button type="button"><CreditCard size={16} />Record Payment</Button>
                    </Link>
                  ) : null}
                  {canCollectOnline ? (
                    <Button type="button" variant="secondary" onClick={() => setCollectOnlineOpen(true)}>
                      <Smartphone size={16} />Collect Online
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {(canRecordPayment || canCollectOnline) && invoice ? <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" aria-hidden="true" /> : null}
              <div className="flex flex-wrap items-center gap-2">
                {invoice ? (
                  <Button type="button" variant="secondary" onClick={() => void handlePrint()}>
                    <Printer size={16} />Print
                  </Button>
                ) : null}
                {invoice && invoice.customerEmail && can("EMAIL_TEMPLATES", "EMAIL_SEND") ? (
                  <Button type="button" variant="secondary" onClick={() => setEmailOpen(true)} title="Send Email">
                    <Mail size={16} />Email
                  </Button>
                ) : null}
                {canSendWhatsApp ? (
                  <Button type="button" variant="secondary" onClick={() => setWhatsAppOpen(true)} title="Send WhatsApp">
                    <MessageCircle size={16} />WhatsApp
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InfoPanel icon={<Building2 size={18} />} title="Company Details">
            <p className="font-extrabold text-slate-950">{user?.company?.name ?? "--"}</p>
            {/* Khaali value ki line hi mat dikhao ("--" ki lines panel bikhra deti thi). */}
            {user?.company?.email ? <p className="break-all">{user.company.email}</p> : null}
            {user?.company?.phone ? <p>{user.company.phone}</p> : null}
            {user?.company?.state ? <p>{user.company.state}</p> : null}
          </InfoPanel>
          <InfoPanel icon={<UserRound size={18} />} title="Customer Details">
            <p className="font-extrabold text-slate-950">{invoice?.customerName ?? "--"}</p>
            {invoice?.customerMobile ? <p>{invoice.customerMobile}</p> : null}
            {invoice?.customerEmail ? <p className="break-all">{invoice.customerEmail}</p> : null}
            {invoice?.customerAddress ? <p>{invoice.customerAddress}</p> : null}
            {invoice?.customerState ? <p>{invoice.customerState}</p> : null}
            {invoice?.customerGstin ? <p className="text-xs font-semibold text-slate-500">GSTIN: {invoice.customerGstin}</p> : null}
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
              <h3 className="fs-18 font-bold text-slate-950">Invoice Items</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">Item-wise billing details and invoice totals.</p>
            </div>
          </div>
          <Table data={invoice?.items ?? []} minHeightClass="min-h-0" columns={[
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
          <h3 className="mb-4 fs-18 font-bold text-slate-950">Payment History</h3>
          <Table data={payments} minHeightClass="min-h-[180px]" emptyText="No payments received for this invoice." columns={[
            { key: "date", header: "Date", render: (item) => formatDate(item.paymentDate) },
            { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-bold text-slate-950">{formatCurrency(item.amount)}</span> },
            { key: "mode", header: "Mode", render: (item) => (
              item.source === "GATEWAY"
                ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 fs-11 font-semibold text-emerald-700">{paymentModeDisplay(item)}</span>
                : paymentModeDisplay(item)
            ) },
            { key: "reference", header: "Reference", render: (item) => <span className="break-all text-xs">{item.referenceNo ?? "--"}</span> },
            { key: "user", header: "Collected By", render: (item) => item.createdBy ?? "--" }
          ]} />
          <PaymentTransactionsList
            transactions={transactions}
            onUpdated={(updated) => {
              setTransactions((current) => current.map((item) => (item.txnRef === updated.txnRef ? updated : item)));
              if (updated.status === "SUCCESS") {
                setReloadKey((key) => key + 1);
              }
            }}
          />
        </GlassCard>

        {profitability ? (
          <GlassCard className="p-5 md:p-7">
            <h3 className="mb-4 fs-18 font-bold text-slate-950">Profitability</h3>
            <div className="space-y-3">
              {/* Net = revenue − maal ki laagat − kharcha. Pehle laagat dikhti hi nahi thi:
                  "Revenue 90,000 · Expense 0 · Net 15,000" galat lagta tha. */}
              <SummaryBox label="Revenue (before tax)" value={formatCurrency(profitability.revenue)} />
              <SummaryBox label="Cost of goods sold" value={`− ${formatCurrency(profitability.costOfGoodsSold)}`} />
              <SummaryBox label="Linked expenses" value={`− ${formatCurrency(profitability.expense)}`} />
              <SummaryBox
                label={`Net profit${Number(profitability.revenue) > 0 ? ` · ${((Number(profitability.netRevenue) / Number(profitability.revenue)) * 100).toFixed(1)}% margin` : ""}`}
                value={formatCurrency(profitability.netRevenue)}
                strong
              />
            </div>
          </GlassCard>
        ) : null}
      </div>

      {invoice ? (
        <CollectOnlineModal
          open={collectOnlineOpen}
          invoiceId={invoice.id}
          invoiceNo={invoice.invoiceNo}
          customerName={invoice.customerName}
          customerMobile={invoice.customerMobile}
          balanceAmount={Number(invoice.balanceAmount)}
          onClose={() => {
            setCollectOnlineOpen(false);
            // Link bana ho to attempts list me dikhe.
            setReloadKey((key) => key + 1);
          }}
          onPaid={() => setReloadKey((key) => key + 1)}
        />
      ) : null}

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
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={whatsAppForm.includePdf} onChange={(event) => setWhatsAppForm((current) => ({ ...current, includePdf: event.target.checked }))} />
              Attach invoice PDF
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
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
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
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

// Invoice no me "/" hota hai (INV/2627/00001); file name me allowed nahi.
const invoicePdfFileName = (invoice: Invoice) => `${invoice.invoiceNo.replace(/[\/]/g, "-")}.pdf`;

const buildInvoiceAttachment = async (invoice: Invoice, templateId?: string) => ({
  fileName: invoicePdfFileName(invoice),
  contentType: "application/pdf",
  base64Content: await blobToBase64(await downloadInvoicePdfFile(invoice.id, templateId))
});

const blobToBase64 = async (blob: Blob) =>
  await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const InfoPanel = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
  <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
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
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className={`${strong ? "text-xl" : "text-lg"} mt-2 font-black text-slate-950`}>{value}</p>
  </div>
);


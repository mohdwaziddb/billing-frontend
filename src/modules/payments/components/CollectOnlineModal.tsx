import { CheckCircle2, Copy, ExternalLink, Link2, MessageCircle, MessageSquare, RefreshCw, Smartphone, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/Button";
import { Input } from "../../../components/Input";
import { Modal } from "../../../components/Modal";
import { StatusBadge } from "../../../components/StatusBadge";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { formatCurrency } from "../../../lib/currency";
import { formatDateTime } from "../../../lib/format";
import { notificationService } from "../../../services/notificationService";
import { useOnlinePayment } from "../hooks/useOnlinePayment";
import { usePaymentGatewayConfig } from "../hooks/usePaymentGatewayConfig";
import { cancelOnlinePayment, sendPaymentLink } from "../paymentGateway.api";
import { isFinalTransactionStatus, type PaymentTransaction } from "../payment.types";

const LINK_POLL_MS = 5000;
const LINK_POLL_MAX_MS = 15 * 60 * 1000;

type CollectOnlineModalProps = {
  open: boolean;
  invoiceId: number;
  invoiceNo: string;
  customerName?: string | null;
  customerMobile?: string | null;
  balanceAmount: number;
  defaultAmount?: number;
  onClose: () => void;
  /** Payment SUCCESS hone par (invoice / payments reload karo). */
  onPaid?: (transaction: PaymentTransaction) => void;
};

const toWhatsAppNumber = (mobile?: string | null) => {
  const digits = (mobile || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
};

/**
 * Common "Collect Online" dialog — kisi bhi gateway ke liye same. Do raste:
 * Pay Now (gateway checkout popup, counter par) ya Payment Link (customer ko bhejo).
 */
export const CollectOnlineModal = ({
  open,
  invoiceId,
  invoiceNo,
  customerName,
  customerMobile,
  balanceAmount,
  defaultAmount,
  onClose,
  onPaid
}: CollectOnlineModalProps) => {
  const { config, loading: configLoading } = usePaymentGatewayConfig(open);
  const { busy, phase, transaction, setTransaction, startCheckout, createLink, refresh, reset } = useOnlinePayment();
  const { setApiError } = useApiMessage();
  const [amountInput, setAmountInput] = useState("");
  const [sending, setSending] = useState<"WHATSAPP" | "SMS" | null>(null);
  const [polling, setPolling] = useState(false);
  const paidNotifiedRef = useRef<string | null>(null);
  const wasOpenRef = useRef(false);

  // Sirf open hote waqt reset — payment ke baad parent invoice reload kare (balance badle) to success view na mite.
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      reset();
      paidNotifiedRef.current = null;
      const initial = defaultAmount && defaultAmount > 0 ? Math.min(defaultAmount, balanceAmount) : balanceAmount;
      setAmountInput(initial > 0 ? initial.toFixed(2) : "");
    }
    wasOpenRef.current = open;
  }, [open, defaultAmount, balanceAmount, reset]);

  const amount = Number(amountInput);
  const amountError = useMemo(() => {
    if (!amountInput.trim() || !Number.isFinite(amount)) {
      return "Enter amount";
    }
    if (amount < 1) {
      return "Minimum online amount is 1.00";
    }
    if (amount > balanceAmount + 0.0001) {
      return `Cannot exceed balance ${formatCurrency(balanceAmount)}`;
    }
    return "";
  }, [amount, amountInput, balanceAmount]);

  // SUCCESS ek hi baar parent ko batao.
  useEffect(() => {
    if (transaction?.status === "SUCCESS" && paidNotifiedRef.current !== transaction.txnRef) {
      paidNotifiedRef.current = transaction.txnRef;
      notificationService.showSuccess(`Payment of ${formatCurrency(transaction.amount)} received`);
      onPaid?.(transaction);
    }
  }, [transaction, onPaid]);

  // Payment link: webhook aaye ya na aaye, status gateway se poll karo.
  useEffect(() => {
    if (!open || !transaction || transaction.channel !== "PAYMENT_LINK" || isFinalTransactionStatus(transaction.status) || transaction.status === "CANCELLED") {
      setPolling(false);
      return;
    }
    setPolling(true);
    const startedAt = Date.now();
    const txnRef = transaction.txnRef;
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > LINK_POLL_MAX_MS) {
        window.clearInterval(timer);
        setPolling(false);
        return;
      }
      refresh(txnRef).catch(() => undefined);
    }, LINK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, transaction?.txnRef, transaction?.status, transaction?.channel, refresh]);

  const handlePayNow = async () => {
    if (amountError) {
      return;
    }
    try {
      const result = await startCheckout(invoiceId, Number(amount.toFixed(2)));
      if (result.status === "FAILED") {
        notificationService.showError(result.failureReason || "Payment failed");
      }
    } catch (error) {
      setApiError(error, "Unable to start online payment");
    }
  };

  const handleCreateLink = async () => {
    if (amountError) {
      return;
    }
    try {
      await createLink(invoiceId, Number(amount.toFixed(2)));
      notificationService.showSuccess("Payment link created");
    } catch (error) {
      setApiError(error, "Unable to create payment link");
    }
  };

  const handleCopy = async () => {
    if (!transaction?.linkUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(transaction.linkUrl);
      notificationService.showSuccess("Link copied");
    } catch {
      notificationService.showError("Unable to copy. Select the link and copy manually.");
    }
  };

  const shareText = transaction?.linkUrl
    ? `Dear ${customerName || "Customer"}, please pay ${formatCurrency(transaction.amount)} for invoice ${invoiceNo}: ${transaction.linkUrl}`
    : "";

  const handleSend = async (channel: "WHATSAPP" | "SMS") => {
    if (!transaction) {
      return;
    }
    setSending(channel);
    try {
      await sendPaymentLink(transaction.txnRef, { channel });
      notificationService.showSuccess(channel === "WHATSAPP" ? "Link sent on WhatsApp" : "Link sent by SMS");
    } catch (error) {
      setApiError(error, "Unable to send payment link");
    } finally {
      setSending(null);
    }
  };

  const handleCancelLink = async () => {
    if (!transaction) {
      return;
    }
    try {
      setTransaction(await cancelOnlinePayment(transaction.txnRef));
    } catch (error) {
      setApiError(error, "Unable to cancel payment link");
    }
  };

  const handleCheckStatus = async () => {
    if (!transaction) {
      return;
    }
    try {
      await refresh(transaction.txnRef);
    } catch (error) {
      setApiError(error, "Unable to check payment status");
    }
  };

  const handleClose = () => {
    if (phase === "checkout" || phase === "verifying") {
      return;
    }
    onClose();
  };

  const status = transaction?.status;
  const showChooser = !transaction || status === "FAILED" || status === "CANCELLED" || status === "EXPIRED";

  return (
    <Modal open={open} title={`Collect Online · ${invoiceNo}`} eyebrow="Online Payment" onClose={handleClose} maxWidthClass="max-w-xl">
      {configLoading ? (
        <p className="text-sm text-slate-500">Loading payment gateway…</p>
      ) : !config?.onlineEnabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Online payment is not enabled. The company owner can turn it on in Setup → Payment Gateway.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
            <span className="text-slate-600">
              {customerName || "Customer"} · Balance <strong className="text-slate-900">{formatCurrency(balanceAmount)}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">{config.gatewayName}</span>
              {config.testMode ? <span className="rounded-full bg-amber-100 px-2 py-0.5 fs-11 font-semibold text-amber-700">TEST MODE</span> : null}
            </span>
          </div>

          {status === "SUCCESS" && transaction ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
              <div className="text-sm text-emerald-900">
                <p className="font-semibold">{formatCurrency(transaction.amount)} received</p>
                <p className="mt-1">
                  {transaction.method ? `${transaction.method.toUpperCase()} · ` : ""}
                  Ref {transaction.gatewayPaymentId}
                </p>
                <p className="mt-1 text-emerald-700">Payment has been recorded on the invoice.</p>
              </div>
            </div>
          ) : null}

          {transaction && (status === "FAILED" || status === "CANCELLED" || status === "EXPIRED") ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <XCircle className="mt-0.5 shrink-0" size={18} />
              <span>
                {status === "CANCELLED" ? "Payment was not completed." : transaction.failureReason || `Payment ${status.toLowerCase()}.`} You can try again.
              </span>
            </div>
          ) : null}

          {showChooser ? (
            <>
              <Input
                label="Amount"
                requiredMark
                type="number"
                step="0.01"
                min={1}
                max={balanceAmount}
                value={amountInput}
                error={amountInput ? amountError : undefined}
                hint="Partial payment allowed. Remaining stays as balance due."
                onChange={(event) => setAmountInput(event.target.value)}
                disabled={busy}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {config.supportsCheckout ? (
                  <Button type="button" onClick={handlePayNow} disabled={busy || Boolean(amountError)}>
                    <Smartphone size={16} />
                    {phase === "checkout" ? "Waiting for payment…" : phase === "verifying" ? "Confirming…" : phase === "starting" ? "Starting…" : "Pay Now"}
                  </Button>
                ) : null}
                {config.supportsPaymentLink ? (
                  <Button type="button" variant="secondary" onClick={handleCreateLink} disabled={busy || Boolean(amountError)}>
                    <Link2 size={16} />
                    Create Payment Link
                  </Button>
                ) : null}
              </div>
              <p className="fs-11 text-slate-500">
                Pay Now opens {config.gatewayName} checkout here (UPI, card, netbanking). A payment link can be shared with the customer; the invoice updates automatically once they pay.
              </p>
            </>
          ) : null}

          {transaction?.channel === "PAYMENT_LINK" && transaction.linkUrl && (status === "CREATED" || status === "PENDING") ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">Payment link · {formatCurrency(transaction.amount)}</p>
                <StatusBadge label={polling ? "PENDING" : status} />
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <a href={transaction.linkUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-[color:var(--theme-color)]">
                  {transaction.linkUrl}
                </a>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Copy link" onClick={handleCopy}>
                  <Copy size={16} />
                </Button>
              </div>
              {transaction.expiresAt ? <p className="fs-11 text-slate-500">Valid till {formatDateTime(transaction.expiresAt)}</p> : null}
              <div className="grid gap-2 sm:grid-cols-3">
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  href={`https://wa.me/${toWhatsAppNumber(customerMobile)}?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} />
                  Open WhatsApp
                </a>
                <Button type="button" variant="secondary" disabled={sending !== null || !customerMobile} onClick={() => handleSend("WHATSAPP")}>
                  <MessageCircle size={15} />
                  {sending === "WHATSAPP" ? "Sending…" : "Send WhatsApp"}
                </Button>
                <Button type="button" variant="secondary" disabled={sending !== null || !customerMobile} onClick={() => handleSend("SMS")}>
                  <MessageSquare size={15} />
                  {sending === "SMS" ? "Sending…" : "Send SMS"}
                </Button>
              </div>
              <p className="fs-11 text-slate-500">
                "Open WhatsApp" uses your own WhatsApp. "Send WhatsApp / SMS" use the provider configured in Setup → Communication.
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleCancelLink}>
                  Cancel Link
                </Button>
                <Button type="button" variant="secondary" onClick={handleCheckStatus}>
                  <RefreshCw size={15} />
                  Check Status
                </Button>
              </div>
            </div>
          ) : null}

          {transaction?.channel === "CHECKOUT" && status === "PENDING" ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <span>Payment is processing at the bank. It will update automatically.</span>
              <Button type="button" variant="secondary" onClick={handleCheckStatus}>
                <RefreshCw size={15} />
                Check
              </Button>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" variant={status === "SUCCESS" ? "primary" : "ghost"} onClick={handleClose} disabled={phase === "checkout" || phase === "verifying"}>
              {status === "SUCCESS" ? "Done" : "Close"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

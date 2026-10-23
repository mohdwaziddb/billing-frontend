import { Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/Button";
import { StatusBadge } from "../../../components/StatusBadge";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { formatCurrency } from "../../../lib/currency";
import { formatDateTime } from "../../../lib/format";
import { notificationService } from "../../../services/notificationService";
import { refreshOnlinePayment } from "../paymentGateway.api";
import type { PaymentTransaction } from "../payment.types";

const isOpen = (transaction: PaymentTransaction) => transaction.status === "CREATED" || transaction.status === "PENDING";

/** Invoice ke online payment attempts (checkout / links) — common list. */
export const PaymentTransactionsList = ({
  transactions,
  onUpdated
}: {
  transactions: PaymentTransaction[];
  onUpdated: (transaction: PaymentTransaction) => void;
}) => {
  const [refreshingRef, setRefreshingRef] = useState<string | null>(null);
  const { setApiError } = useApiMessage();

  if (transactions.length === 0) {
    return null;
  }

  const handleRefresh = async (txnRef: string) => {
    setRefreshingRef(txnRef);
    try {
      onUpdated(await refreshOnlinePayment(txnRef));
    } catch (error) {
      setApiError(error, "Unable to check payment status");
    } finally {
      setRefreshingRef(null);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notificationService.showSuccess("Link copied");
    } catch {
      notificationService.showError("Unable to copy link");
    }
  };

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Online Payment Attempts</h4>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {transactions.map((transaction) => (
          <div key={transaction.txnRef} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 fs-13">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {formatCurrency(transaction.amount)} · {transaction.channel === "PAYMENT_LINK" ? "Payment Link" : "Checkout"}
                {transaction.method ? ` · ${transaction.method.toUpperCase()}` : ""}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {transaction.txnRef}
                {transaction.gatewayPaymentId ? ` · ${transaction.gatewayPaymentId}` : ""} · {formatDateTime(transaction.createdAt)}
              </p>
              {transaction.failureReason && transaction.status !== "SUCCESS" ? (
                <p className="mt-0.5 text-xs text-rose-600">{transaction.failureReason}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge label={transaction.status === "SUCCESS" ? "PAID" : transaction.status} />
              {transaction.linkUrl && isOpen(transaction) ? (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Copy payment link" onClick={() => void handleCopy(transaction.linkUrl as string)}>
                  <Copy size={15} />
                </Button>
              ) : null}
              {isOpen(transaction) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Check payment status"
                  disabled={refreshingRef === transaction.txnRef}
                  onClick={() => void handleRefresh(transaction.txnRef)}
                >
                  <RefreshCw size={15} className={refreshingRef === transaction.txnRef ? "animate-spin" : undefined} />
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

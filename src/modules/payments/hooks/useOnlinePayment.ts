import { useCallback, useState } from "react";
import { getGatewayAdapter } from "../gateways";
import {
  cancelOnlinePayment,
  initiateOnlinePayment,
  refreshOnlinePayment,
  verifyOnlinePayment
} from "../paymentGateway.api";
import type { PaymentTransaction } from "../payment.types";

export type OnlinePaymentPhase = "idle" | "starting" | "checkout" | "verifying" | "done";

/**
 * Common online payment flow (gateway-agnostic):
 * initiate → gateway adapter checkout → verify / cancel, ya payment link banana.
 * Final status hamesha backend ka (webhook / refresh) — browser par bharosa nahi.
 */
export const useOnlinePayment = () => {
  const [phase, setPhase] = useState<OnlinePaymentPhase>("idle");
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);

  const startCheckout = useCallback(async (invoiceId: number, amount: number) => {
    setPhase("starting");
    try {
      const initiated = await initiateOnlinePayment({ invoiceId, amount, channel: "CHECKOUT" });
      setTransaction(initiated);
      const adapter = getGatewayAdapter(initiated.gatewayType);
      setPhase("checkout");
      const result = await adapter.open(initiated.checkout || {});
      setPhase("verifying");
      let next: PaymentTransaction;
      if (result.status === "SUCCESS") {
        next = await verifyOnlinePayment(initiated.txnRef, result.data);
      } else {
        // Popup band: UPI app me pay karke bhi band ho sakta hai — pehle gateway se check.
        next = await refreshOnlinePayment(initiated.txnRef);
        if (next.status !== "SUCCESS") {
          next = await cancelOnlinePayment(initiated.txnRef);
        }
      }
      setTransaction(next);
      return next;
    } finally {
      setPhase("done");
    }
  }, []);

  const createLink = useCallback(async (invoiceId: number, amount: number, expiryDays?: number) => {
    setPhase("starting");
    try {
      const created = await initiateOnlinePayment({ invoiceId, amount, channel: "PAYMENT_LINK", expiryDays });
      setTransaction(created);
      return created;
    } finally {
      setPhase("done");
    }
  }, []);

  const refresh = useCallback(async (txnRef: string) => {
    const next = await refreshOnlinePayment(txnRef);
    setTransaction(next);
    return next;
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setTransaction(null);
  }, []);

  return {
    phase,
    busy: phase === "starting" || phase === "checkout" || phase === "verifying",
    transaction,
    setTransaction,
    startCheckout,
    createLink,
    refresh,
    reset
  };
};

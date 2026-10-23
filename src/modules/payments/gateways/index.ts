import type { PaymentGatewayType } from "../payment.types";
import { razorpayAdapter } from "./razorpayAdapter";
import type { GatewayCheckoutAdapter } from "./types";

// Naya gateway (Cashfree / PhonePe / PayU …) = adapter file + yahan ek entry.
const adapters: Record<string, GatewayCheckoutAdapter> = {
  [razorpayAdapter.type]: razorpayAdapter
};

export const getGatewayAdapter = (type: PaymentGatewayType | null | undefined) => {
  const adapter = type ? adapters[type] : undefined;
  if (!adapter) {
    throw new Error(`Checkout for ${type || "this gateway"} is not supported in the browser yet`);
  }
  return adapter;
};

export type { GatewayCheckoutAdapter, GatewayCheckoutResult } from "./types";

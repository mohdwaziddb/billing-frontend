import type { PaymentGatewayType } from "../payment.types";

export type GatewayCheckoutResult =
  | { status: "SUCCESS"; data: Record<string, unknown> }
  | { status: "DISMISSED" }
  | { status: "FAILED"; reason: string };

/**
 * Har gateway ka browser-side checkout. Backend initiate response ka
 * `checkout` object as-is milta hai; adapter gateway SDK khol ke result deta hai.
 * Naya gateway = ek adapter file + gateways/index.ts me register.
 */
export type GatewayCheckoutAdapter = {
  type: PaymentGatewayType;
  load: () => Promise<void>;
  open: (options: Record<string, unknown>) => Promise<GatewayCheckoutResult>;
};

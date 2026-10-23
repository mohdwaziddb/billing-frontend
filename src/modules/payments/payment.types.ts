export type PaymentGatewayType = "RAZORPAY" | (string & {});

export type PaymentTransactionStatus = "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "CANCELLED";

export type PaymentTransactionChannel = "CHECKOUT" | "PAYMENT_LINK";

export type PaymentGatewayField = {
  key: string;
  label: string;
  type: "text" | "password" | string;
  required: boolean;
  sensitive: boolean;
  placeholder?: string | null;
  helpText?: string | null;
};

export type PaymentGatewayMetadata = {
  gatewayType: PaymentGatewayType;
  gatewayName: string;
  description?: string | null;
  supportsCheckout: boolean;
  supportsPaymentLink: boolean;
  dashboardUrl?: string | null;
  webhookEvents: string[];
  fields: PaymentGatewayField[];
};

export type PaymentGatewaySetting = {
  id: number;
  gatewayType: PaymentGatewayType;
  displayName: string | null;
  testMode: boolean;
  active: boolean;
  defaultGateway: boolean;
  /** Secret fields "****abcd" masked aate hain; wahi wapas bhejo to purani value rahti hai. */
  config: Record<string, string>;
  /** API base ke relative path (e.g. /v1/payment-gateway/webhook/RAZORPAY?company_code=X). */
  webhookUrl: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type PaymentGatewaySettingRequest = {
  gatewayType: PaymentGatewayType;
  displayName?: string;
  testMode: boolean;
  active: boolean;
  defaultGateway?: boolean;
  config: Record<string, string>;
};

export type PaymentGatewayHealth = {
  success: boolean;
  message: string;
};

export type PaymentGatewayPublicConfig = {
  onlineEnabled: boolean;
  gatewayType?: PaymentGatewayType | null;
  gatewayName?: string | null;
  testMode: boolean;
  supportsCheckout: boolean;
  supportsPaymentLink: boolean;
  onlineModeCode: string;
};

export type PaymentTransaction = {
  id: number;
  txnRef: string;
  gatewayType: PaymentGatewayType;
  channel: PaymentTransactionChannel;
  status: PaymentTransactionStatus;
  invoiceId: number;
  invoiceNo: string;
  customerId: number;
  customerName: string;
  customerMobile?: string | null;
  amount: number;
  currency: string;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  linkUrl?: string | null;
  method?: string | null;
  failureReason?: string | null;
  paymentId?: number | null;
  settledAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  createdBy?: string | null;
  /** Sirf initiate (CHECKOUT) response me: gateway checkout adapter ke options. */
  checkout?: Record<string, unknown> | null;
};

export type InitiateOnlinePaymentRequest = {
  invoiceId: number;
  amount: number;
  channel: PaymentTransactionChannel;
  expiryDays?: number;
};

export type SendPaymentLinkRequest = {
  channel: "WHATSAPP" | "SMS";
  mobile?: string;
};

export const isFinalTransactionStatus = (status: PaymentTransactionStatus) =>
  status === "SUCCESS" || status === "FAILED" || status === "EXPIRED";

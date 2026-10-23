import { apiClient } from "../../api/apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  InitiateOnlinePaymentRequest,
  PaymentGatewayHealth,
  PaymentGatewayMetadata,
  PaymentGatewayPublicConfig,
  PaymentGatewaySetting,
  PaymentGatewaySettingRequest,
  PaymentTransaction,
  SendPaymentLinkRequest
} from "./payment.types";

const BASE = "/v1/payment-gateway";

export const getPaymentGatewayProviders = async () => {
  const response = await apiClient.get<ApiResponse<PaymentGatewayMetadata[]>>(`${BASE}/providers`);
  return response.data.data;
};

export const getPaymentGatewaySettings = async () => {
  const response = await apiClient.get<ApiResponse<PaymentGatewaySetting[]>>(`${BASE}/settings`);
  return response.data.data;
};

export const savePaymentGatewaySettings = async (payload: PaymentGatewaySettingRequest) => {
  const response = await apiClient.put<ApiResponse<PaymentGatewaySetting>>(`${BASE}/settings`, payload);
  return response.data.data;
};

export const testPaymentGatewaySettings = async (payload: PaymentGatewaySettingRequest) => {
  const response = await apiClient.post<ApiResponse<PaymentGatewayHealth>>(`${BASE}/settings/test`, payload);
  return response.data.data;
};

export const getPaymentGatewayConfig = async () => {
  const response = await apiClient.get<ApiResponse<PaymentGatewayPublicConfig>>(`${BASE}/config`, { skipPageLoader: true });
  return response.data.data;
};

export const initiateOnlinePayment = async (payload: InitiateOnlinePaymentRequest) => {
  const response = await apiClient.post<ApiResponse<PaymentTransaction>>(`${BASE}/transactions/initiate`, payload);
  return response.data.data;
};

export const verifyOnlinePayment = async (txnRef: string, payload: Record<string, unknown>) => {
  const response = await apiClient.post<ApiResponse<PaymentTransaction>>(`${BASE}/transactions/${encodeURIComponent(txnRef)}/verify`, payload);
  return response.data.data;
};

export const cancelOnlinePayment = async (txnRef: string) => {
  const response = await apiClient.post<ApiResponse<PaymentTransaction>>(`${BASE}/transactions/${encodeURIComponent(txnRef)}/cancel`);
  return response.data.data;
};

/** Gateway se live status (polling); POST kyunki success par Payment bhi ban sakta hai. */
export const refreshOnlinePayment = async (txnRef: string) => {
  const response = await apiClient.post<ApiResponse<PaymentTransaction>>(
    `${BASE}/transactions/${encodeURIComponent(txnRef)}/refresh`,
    undefined,
    { skipPageLoader: true }
  );
  return response.data.data;
};

export const sendPaymentLink = async (txnRef: string, payload: SendPaymentLinkRequest) => {
  const response = await apiClient.post<ApiResponse<{ status: string; channel: string }>>(
    `${BASE}/transactions/${encodeURIComponent(txnRef)}/send-link`,
    payload
  );
  return response.data.data;
};

export const getInvoiceTransactions = async (invoiceId: number) => {
  const response = await apiClient.get<ApiResponse<PaymentTransaction[]>>(`${BASE}/transactions`, {
    params: { invoiceId },
    skipPageLoader: true
  });
  return response.data.data;
};

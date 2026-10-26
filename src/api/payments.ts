import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, Payment, PaymentRequest } from "../types/api";

export type PaymentFilterParams = {
  search?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string | number;
  maxAmount?: string | number;
  mode?: string;
  invoiceLinked?: boolean;
  invoiceId?: number;
  createdByRole?: string;
  recordStatus?: "ACTIVE" | "DELETED" | "ALL";
  page?: number;
  size?: number;
};

export const getPaymentsPage = async (params?: PaymentFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Payment>>>("/v1/payments", { params });
  return response.data.data;
};

export type PaymentSummary = {
  totalRecords: number;
  totalAmount: number;
  byMode: Record<string, number>;
};

// KPI cards: backend aggregate (same filters). Pehle saare pages laakar browser me jodte the.
export const getPaymentsSummary = async (params?: Omit<PaymentFilterParams, "page" | "size">) => {
  const response = await apiClient.get<ApiResponse<PaymentSummary>>("/v1/payments/summary", { params });
  return response.data.data;
};

// "Show Logs" action: saari rows ka log count ek call me (pehle har row ki alag call).
export const getPaymentLogCounts = async (ids: number[]) => {
  const response = await apiClient.get<ApiResponse<Record<string, number>>>("/v1/audit-logs/counts", {
    params: { moduleName: "Payment", entityIds: ids.join(",") },
    skipPageLoader: true
  });
  return response.data.data;
};

export const getPayments = async (params?: PaymentFilterParams) => {
  const response = await getPaymentsPage(params);
  return response.records;
};

export const createPayment = async (payload: PaymentRequest) => {
  const response = await apiClient.post<ApiResponse<Payment>>("/v1/payments", payload);
  return response.data.data;
};

export const deletePayment = async (id: number) => {
  await apiClient.delete(`/v1/payments/${id}`);
};

export const restorePayment = async (id: number) => {
  const response = await apiClient.post<ApiResponse<Payment>>(`/v1/payments/${id}/restore`);
  return response.data.data;
};

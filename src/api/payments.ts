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
  createdByRole?: string;
  page?: number;
  size?: number;
};

export const getPaymentsPage = async (params?: PaymentFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Payment>>>("/v1/payments", { params });
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

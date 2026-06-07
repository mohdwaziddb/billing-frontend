import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, Payment, PaymentRequest } from "../types/api";

export const getPaymentsPage = async (params?: { page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Payment>>>("/v1/payments", { params });
  return response.data.data;
};

export const getPayments = async (params?: { page?: number; size?: number }) => {
  const response = await getPaymentsPage(params);
  return response.records;
};

export const createPayment = async (payload: PaymentRequest) => {
  const response = await apiClient.post<ApiResponse<Payment>>("/v1/payments", payload);
  return response.data.data;
};

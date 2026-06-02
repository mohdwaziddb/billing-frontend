import { apiClient } from "./apiClient";
import type { ApiResponse, Payment, PaymentRequest } from "../types/api";

export const getPayments = async () => {
  const response = await apiClient.get<ApiResponse<Payment[]>>("/v1/payments");
  return response.data.data;
};

export const createPayment = async (payload: PaymentRequest) => {
  const response = await apiClient.post<ApiResponse<Payment>>("/v1/payments", payload);
  return response.data.data;
};

import { apiClient } from "./apiClient";
import type { ApiResponse, PaymentHierarchyResponse } from "../types/api";

export type PaymentHierarchyParams = {
  nodeType?: string;
  nodeId?: string;
  mode?: string;
  year?: number;
  month?: number;
  day?: string;
  startDate?: string;
  endDate?: string;
  financialYear?: number;
  customerId?: number;
  collectedBy?: string;
};

export const getPaymentHierarchyChildren = async (params?: PaymentHierarchyParams) => {
  const response = await apiClient.get<ApiResponse<PaymentHierarchyResponse>>("/v1/payment-hierarchy/children", { params });
  return response.data.data;
};

export const getPaymentHierarchySummary = async (params?: PaymentHierarchyParams) => {
  const response = await apiClient.get<ApiResponse<PaymentHierarchyResponse>>("/v1/payment-hierarchy/summary", { params });
  return response.data.data;
};

import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, Purchase, PurchaseRequest } from "../types/api";

export const getPurchasesPage = async (params?: { active?: boolean; search?: string; startDate?: string; endDate?: string; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Purchase>>>("/v1/purchases", { params });
  return response.data.data;
};

export const getPurchase = async (id: number) => {
  const response = await apiClient.get<ApiResponse<Purchase>>(`/v1/purchases/${id}`);
  return response.data.data;
};

export const createPurchase = async (payload: PurchaseRequest) => {
  const response = await apiClient.post<ApiResponse<Purchase>>("/v1/purchases", payload);
  return response.data.data;
};

export const deletePurchase = async (id: number) => {
  await apiClient.delete(`/v1/purchases/${id}`);
};

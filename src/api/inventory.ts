import { apiClient } from "./apiClient";
import type { ApiResponse, InventoryLedgerEntry, PageResponse } from "../types/api";

export const getInventoryLedgerPage = async (params?: { productId?: number; startDate?: string; endDate?: string; search?: string; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<InventoryLedgerEntry>>>("/v1/inventory/ledger", { params });
  return response.data.data;
};

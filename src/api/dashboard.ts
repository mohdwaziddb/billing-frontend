import { apiClient } from "./apiClient";
import type { ApiResponse, DashboardSummary } from "../types/api";

export const getDashboardSummary = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>("/v1/dashboard/summary", {
    params
  });
  return response.data.data;
};

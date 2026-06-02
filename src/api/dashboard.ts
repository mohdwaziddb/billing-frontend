import { apiClient } from "./apiClient";
import type { ApiResponse, DashboardSummary } from "../types/api";

export const getDashboardSummary = async () => {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>("/v1/dashboard/summary");
  return response.data.data;
};

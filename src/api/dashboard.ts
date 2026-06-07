import { apiClient } from "./apiClient";
import type { ApiResponse, DashboardCardKey, DashboardDetail, DashboardSummary } from "../types/api";

export const getDashboardSummary = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>("/v1/dashboard/summary", {
    params
  });
  return response.data.data;
};

export const getDashboardDetails = async (params: {
  card: DashboardCardKey;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  search?: string;
}) => {
  const response = await apiClient.get<ApiResponse<DashboardDetail>>("/v1/dashboard/details", {
    params
  });
  return response.data.data;
};

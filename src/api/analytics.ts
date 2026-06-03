import { apiClient } from "./apiClient";
import type {
  AnalyticsSummary,
  ApiResponse,
  CustomerDue,
  LowStockProduct,
  OwnerAnalytics,
  SalesChartPoint,
  TopSellingProduct
} from "../types/api";

export const getAnalyticsSummary = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await apiClient.get<ApiResponse<AnalyticsSummary>>("/v1/analytics/summary", {
    params
  });
  return response.data.data;
};

export const getDayWiseSales = async (year?: number, month?: number) => {
  const response = await apiClient.get<ApiResponse<SalesChartPoint[]>>("/v1/analytics/day-wise-sales", {
    params: { year, month }
  });
  return response.data.data;
};

export const getMonthWiseSales = async (year?: number) => {
  const response = await apiClient.get<ApiResponse<SalesChartPoint[]>>("/v1/analytics/month-wise-sales", {
    params: { year }
  });
  return response.data.data;
};

export const getTopProducts = async (limit = 5) => {
  const response = await apiClient.get<ApiResponse<TopSellingProduct[]>>("/v1/analytics/top-products", {
    params: { limit }
  });
  return response.data.data;
};

export const getLowStockProducts = async (limit = 5) => {
  const response = await apiClient.get<ApiResponse<LowStockProduct[]>>("/v1/analytics/low-stock-products", {
    params: { limit }
  });
  return response.data.data;
};

export const getCustomerDueList = async (limit = 10) => {
  const response = await apiClient.get<ApiResponse<CustomerDue[]>>("/v1/analytics/customer-due-list", {
    params: { limit }
  });
  return response.data.data;
};

export const getOwnerAnalytics = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await apiClient.get<ApiResponse<OwnerAnalytics>>("/v1/analytics/owner-overview", {
    params
  });
  return response.data.data;
};

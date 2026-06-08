import { apiClient } from "./apiClient";
import type {
  AnalyticsSummary,
  ApiResponse,
  CustomerDue,
  LowStockProduct,
  OwnerAnalytics,
  PageResponse,
  SalesByCategory,
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

export const getTopProducts = async (params?: { startDate?: string; endDate?: string; search?: string; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<TopSellingProduct>>>("/v1/analytics/top-products", {
    params
  });
  return response.data.data;
};

export const getLowStockProducts = async (params?: { page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<LowStockProduct>>>("/v1/analytics/low-stock-products", {
    params
  });
  return response.data.data;
};

export const getCustomerDueList = async (params?: { search?: string; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<CustomerDue>>>("/v1/analytics/customer-due-list", {
    params
  });
  return response.data.data;
};

export const getOwnerAnalytics = async (params?: { startDate?: string; endDate?: string }) => {
  const response = await apiClient.get<ApiResponse<OwnerAnalytics>>("/v1/analytics/owner-overview", {
    params
  });
  return response.data.data;
};

export const getSalesByCategory = async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
  const response = await apiClient.get<ApiResponse<SalesByCategory[]>>("/v1/analytics/sales-by-category", {
    params
  });
  return response.data.data;
};

export const getSalesByCategoryDetails = async (params?: { startDate?: string; endDate?: string; search?: string; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<SalesByCategory>>>("/v1/analytics/sales-by-category/details", {
    params
  });
  return response.data.data;
};

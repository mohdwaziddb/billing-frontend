import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  PageResponse,
  PlatformAdminCompany,
  PlatformAdminCompanyDetails,
  PlatformAdminCompanyOverview,
  PlatformAdminDashboardSummary,
  PlatformAdminSettings
} from "../types/api";

export type PlatformAdminCompanyFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
};

export type UpdatePlatformAdminSettingsPayload = {
  platformName?: string;
  platformTagline?: string;
  username?: string;
  password?: string;
};

export const getPlatformAdminDashboard = async () => {
  const response = await apiClient.get<ApiResponse<PlatformAdminDashboardSummary>>("/v1/platform-admin/dashboard");
  return response.data.data;
};

export const getPlatformAdminCompanies = async (params?: PlatformAdminCompanyFilters) => {
  const response = await apiClient.get<ApiResponse<PageResponse<PlatformAdminCompany>>>("/v1/platform-admin/companies", { params });
  return response.data.data;
};

export const getPlatformAdminCompanyOverview = async (params?: Pick<PlatformAdminCompanyFilters, "search" | "active">) => {
  const response = await apiClient.get<ApiResponse<PlatformAdminCompanyOverview>>("/v1/platform-admin/companies/overview", { params });
  return response.data.data;
};

export const activatePlatformAdminCompany = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/activate`);
  return response.data.data;
};

export const deactivatePlatformAdminCompany = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/deactivate`);
  return response.data.data;
};

export const enablePlatformAdminCompanyChatbot = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/chatbot/enable`);
  return response.data.data;
};

export const disablePlatformAdminCompanyChatbot = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/chatbot/disable`);
  return response.data.data;
};

export const resetSuperAdminPassword = async (companyCode: string, password: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/super-admin/reset`, { password });
  return response.data.data;
};

export const getPlatformAdminCompanyDetails = async (companyCode: string) => {
  const response = await apiClient.get<ApiResponse<PlatformAdminCompanyDetails>>(`/v1/platform-admin/companies/${companyCode}`);
  return response.data.data;
};

export const getPlatformAdminSettings = async () => {
  const response = await apiClient.get<ApiResponse<PlatformAdminSettings>>("/v1/platform-admin/settings");
  return response.data.data;
};

export const updatePlatformAdminSettings = async (payload: UpdatePlatformAdminSettingsPayload) => {
  const response = await apiClient.put<ApiResponse<PlatformAdminSettings>>("/v1/platform-admin/settings", payload);
  return response.data.data;
};


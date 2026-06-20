import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  PageResponse,
  PlatformAdminCompany,
  PlatformAdminCompanyDetails,
  PlatformAdminCompanyOverview,
  PlatformAdminDashboardSummary,
  PlatformAdminSettings,
  ProviderSettings,
  ProviderSettingsRequest
} from "../types/api";

export type PlatformAdminCompanyFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
};

export type CreatePlatformAdminCompanyPayload = {
  companyName: string;
  address: string;
  gstNumber: string;
  mobile: string;
  email: string;
  ownerName: string;
  ownerUsername: string;
  ownerEmail: string;
  ownerMobile: string;
  ownerPassword: string;
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

export const createPlatformAdminCompany = async (payload: CreatePlatformAdminCompanyPayload) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>("/v1/platform-admin/companies", payload);
  return response.data.data;
};

export const activatePlatformAdminCompany = async (companyId: number) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyId}/activate`);
  return response.data.data;
};

export const deactivatePlatformAdminCompany = async (companyId: number) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyId}/deactivate`);
  return response.data.data;
};

export const getPlatformAdminCompanyDetails = async (companyId: number) => {
  const response = await apiClient.get<ApiResponse<PlatformAdminCompanyDetails>>(`/v1/platform-admin/companies/${companyId}`);
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

export const getPlatformAdminEmailSettings = async (companyId: number) => {
  const response = await apiClient.get<ApiResponse<ProviderSettings[]>>(`/v1/platform-admin/companies/${companyId}/communication/email-settings`);
  return response.data.data;
};

export const createPlatformAdminEmailSettings = async (companyId: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/email-settings`, payload);
  return response.data.data;
};

export const updatePlatformAdminEmailSettings = async (companyId: number, id: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.put<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/email-settings/${id}`, payload);
  return response.data.data;
};

export const testPlatformAdminEmailSettings = async (companyId: number, recipientEmail: string) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/email-settings/test`, { recipientEmail });
  return response.data.data;
};

export const getPlatformAdminSmsSettings = async (companyId: number) => {
  const response = await apiClient.get<ApiResponse<ProviderSettings[]>>(`/v1/platform-admin/companies/${companyId}/communication/sms-settings`);
  return response.data.data;
};

export const createPlatformAdminSmsSettings = async (companyId: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/sms-settings`, payload);
  return response.data.data;
};

export const updatePlatformAdminSmsSettings = async (companyId: number, id: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.put<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/sms-settings/${id}`, payload);
  return response.data.data;
};

export const testPlatformAdminSmsSettings = async (companyId: number, mobileNumber: string) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/sms-settings/test`, { mobileNumber });
  return response.data.data;
};

export const getPlatformAdminWhatsAppSettings = async (companyId: number) => {
  const response = await apiClient.get<ApiResponse<ProviderSettings[]>>(`/v1/platform-admin/companies/${companyId}/communication/whatsapp-settings`);
  return response.data.data;
};

export const createPlatformAdminWhatsAppSettings = async (companyId: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/whatsapp-settings`, payload);
  return response.data.data;
};

export const updatePlatformAdminWhatsAppSettings = async (companyId: number, id: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.put<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/whatsapp-settings/${id}`, payload);
  return response.data.data;
};

export const testPlatformAdminWhatsAppSettings = async (companyId: number, mobileNumber: string, message: string) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>(`/v1/platform-admin/companies/${companyId}/communication/whatsapp-settings/test`, { mobileNumber, message });
  return response.data.data;
};

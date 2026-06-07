import { apiClient } from "./apiClient";
import type { ApiResponse, CompanySummary, CompanyTheme } from "../types/api";

export type CompanySettingsRequest = {
  name: string;
  legalName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  taxId: string;
  panNumber?: string;
  cinNumber?: string;
  websiteUrl?: string;
  databaseName?: string;
};

export const getCompanySettings = async () => {
  const response = await apiClient.get<ApiResponse<CompanySummary>>("/v1/company");
  return response.data.data;
};

export const updateCompanySettings = async (payload: CompanySettingsRequest) => {
  const response = await apiClient.put<ApiResponse<CompanySummary>>("/v1/company", payload);
  return response.data.data;
};

export const uploadCompanyLogo = async (logo: File) => {
  const formData = new FormData();
  formData.append("logo", logo);
  const response = await apiClient.put<ApiResponse<CompanySummary>>("/v1/company/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data.data;
};

export const getCompanyTheme = async () => {
  const response = await apiClient.get<ApiResponse<CompanyTheme>>("/v1/company/theme");
  return response.data.data;
};

export const updateCompanyTheme = async (themeColor: string) => {
  const response = await apiClient.put<ApiResponse<CompanyTheme>>("/v1/company/theme", { themeColor });
  return response.data.data;
};

export const resetCompanyTheme = async () => {
  const response = await apiClient.post<ApiResponse<CompanyTheme>>("/v1/company/theme/reset");
  return response.data.data;
};

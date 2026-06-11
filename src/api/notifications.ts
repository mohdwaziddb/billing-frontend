import { apiClient } from "./apiClient";
import type { ApiResponse, ProviderSettings, ProviderSettingsRequest } from "../types/api";

export const getEmailSettings = async () => {
  const response = await apiClient.get<ApiResponse<ProviderSettings[]>>("/v1/notifications/email-settings");
  return response.data.data;
};

export const createEmailSettings = async (payload: ProviderSettingsRequest) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>("/v1/notifications/email-settings", payload);
  return response.data.data;
};

export const updateEmailSettings = async (id: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.put<ApiResponse<ProviderSettings>>(`/v1/notifications/email-settings/${id}`, payload);
  return response.data.data;
};

export const getSmsSettings = async () => {
  const response = await apiClient.get<ApiResponse<ProviderSettings[]>>("/v1/notifications/sms-settings");
  return response.data.data;
};

export const createSmsSettings = async (payload: ProviderSettingsRequest) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>("/v1/notifications/sms-settings", payload);
  return response.data.data;
};

export const updateSmsSettings = async (id: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.put<ApiResponse<ProviderSettings>>(`/v1/notifications/sms-settings/${id}`, payload);
  return response.data.data;
};

import { apiClient } from "./apiClient";
import type { ApiResponse, NotificationLog, NotificationSendRequest, ProviderSettings, ProviderSettingsRequest } from "../types/api";

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

export const sendTestEmail = async (recipientEmail: string) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>("/v1/notifications/email-settings/test", { recipientEmail });
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

export const sendTestSms = async (mobileNumber: string) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>("/v1/notifications/sms-settings/test", { mobileNumber });
  return response.data.data;
};

export const getWhatsAppSettings = async () => {
  const response = await apiClient.get<ApiResponse<ProviderSettings[]>>("/v1/notifications/whatsapp-settings");
  return response.data.data;
};

export const createWhatsAppSettings = async (payload: ProviderSettingsRequest) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>("/v1/notifications/whatsapp-settings", payload);
  return response.data.data;
};

export const updateWhatsAppSettings = async (id: number, payload: ProviderSettingsRequest) => {
  const response = await apiClient.put<ApiResponse<ProviderSettings>>(`/v1/notifications/whatsapp-settings/${id}`, payload);
  return response.data.data;
};

export const sendTestWhatsApp = async (mobileNumber: string, message: string) => {
  const response = await apiClient.post<ApiResponse<ProviderSettings>>("/v1/notifications/whatsapp-settings/test", { mobileNumber, message });
  return response.data.data;
};

export const sendEmailNotification = async (payload: NotificationSendRequest) => {
  const response = await apiClient.post<ApiResponse<NotificationLog[]>>("/v1/notifications/send-email", payload);
  return response.data.data;
};

export const sendSmsNotification = async (payload: NotificationSendRequest) => {
  const response = await apiClient.post<ApiResponse<NotificationLog[]>>("/v1/notifications/send-sms", payload);
  return response.data.data;
};

export const sendWhatsAppNotification = async (payload: NotificationSendRequest) => {
  const response = await apiClient.post<ApiResponse<NotificationLog[]>>("/v1/notifications/send-whatsapp", payload);
  return response.data.data;
};

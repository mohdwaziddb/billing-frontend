import { apiClient } from "./apiClient";
import type { ApiResponse, EmailPreview, PageResponse, SmsTemplate, SmsTemplateRequest } from "../types/api";

export const getSmsTemplatesPage = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<SmsTemplate>>>("/v1/sms-templates", { params });
  return response.data.data;
};

export const getActiveSmsTemplates = async () => {
  const response = await apiClient.get<ApiResponse<SmsTemplate[]>>("/v1/sms-templates/active");
  return response.data.data;
};

export const getSmsTemplateVariables = async () => {
  const response = await apiClient.get<ApiResponse<Record<string, string>>>("/v1/sms-templates/variables");
  return response.data.data;
};

export const createSmsTemplate = async (payload: SmsTemplateRequest) => {
  const response = await apiClient.post<ApiResponse<SmsTemplate>>("/v1/sms-templates", payload);
  return response.data.data;
};

export const updateSmsTemplate = async (id: number, payload: SmsTemplateRequest) => {
  const response = await apiClient.put<ApiResponse<SmsTemplate>>(`/v1/sms-templates/${id}`, payload);
  return response.data.data;
};

export const deleteSmsTemplate = async (id: number) => {
  await apiClient.delete(`/v1/sms-templates/${id}`);
};

export const previewSmsTemplate = async (id: number, variables?: Record<string, unknown>) => {
  const response = await apiClient.post<ApiResponse<EmailPreview>>(`/v1/sms-templates/${id}/preview`, { variables });
  return response.data.data;
};

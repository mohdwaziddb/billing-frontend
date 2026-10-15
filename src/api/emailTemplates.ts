import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  EmailPreview,
  EmailTemplate,
  EmailTemplateRequest,
  PageResponse
} from "../types/api";

export const getEmailTemplatesPage = async (params?: {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
}) => {
  const response = await apiClient.get<ApiResponse<PageResponse<EmailTemplate>>>("/v1/email-templates", { params });
  return response.data.data;
};

export const getActiveEmailTemplates = async () => {
  const response = await apiClient.get<ApiResponse<EmailTemplate[]>>("/v1/email-templates/active");
  return response.data.data;
};

export const getEmailTemplateVariables = async () => {
  const response = await apiClient.get<ApiResponse<Record<string, string>>>("/v1/email-templates/variables");
  return response.data.data;
};

export const createEmailTemplate = async (payload: EmailTemplateRequest) => {
  const response = await apiClient.post<ApiResponse<EmailTemplate>>("/v1/email-templates", payload);
  return response.data.data;
};

export const updateEmailTemplate = async (id: number, payload: EmailTemplateRequest) => {
  const response = await apiClient.put<ApiResponse<EmailTemplate>>(`/v1/email-templates/${id}`, payload);
  return response.data.data;
};

export const deleteEmailTemplate = async (id: number) => {
  await apiClient.delete<ApiResponse<{ status: string }>>(`/v1/email-templates/${id}`);
};

export const previewEmailTemplate = async (id: number, variables?: Record<string, unknown>) => {
  const response = await apiClient.post<ApiResponse<EmailPreview>>(`/v1/email-templates/${id}/preview`, { variables });
  return response.data.data;
};

import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  CompanyInvoiceSettings,
  CompanyInvoiceSettingsRequest,
  InvoiceRenderResponse,
  InvoiceTemplateMetadata,
  InvoiceTemplatePreviewRequest
} from "../types/api";

export const getInvoiceTemplates = async () => {
  const response = await apiClient.get<ApiResponse<InvoiceTemplateMetadata[]>>("/v1/invoice-templates");
  return response.data.data;
};

export const getInvoiceTemplateSettings = async () => {
  const response = await apiClient.get<ApiResponse<CompanyInvoiceSettings>>("/v1/invoice-templates/settings");
  return response.data.data;
};

export const updateInvoiceTemplateSettings = async (payload: CompanyInvoiceSettingsRequest) => {
  const response = await apiClient.put<ApiResponse<CompanyInvoiceSettings>>("/v1/invoice-templates/settings", payload);
  return response.data.data;
};

export const previewInvoiceTemplate = async (templateId: string, payload?: InvoiceTemplatePreviewRequest) => {
  const response = await apiClient.post<ApiResponse<InvoiceRenderResponse>>(`/v1/invoice-templates/${templateId}/preview`, payload ?? {});
  return response.data.data;
};

export const renderInvoiceHtml = async (invoiceId: number, templateId?: string) => {
  const response = await apiClient.get<ApiResponse<InvoiceRenderResponse>>(`/v1/invoices/${invoiceId}/render`, {
    params: { templateId }
  });
  return response.data.data;
};

export const downloadInvoicePdfFile = async (invoiceId: number, templateId?: string) => {
  const response = await apiClient.get(`/v1/invoices/${invoiceId}/pdf`, {
    params: { templateId },
    responseType: "blob"
  });
  return response.data as Blob;
};

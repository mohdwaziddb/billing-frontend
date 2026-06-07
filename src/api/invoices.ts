import { apiClient } from "./apiClient";
import type { ApiResponse, Invoice, InvoiceRequest, PageResponse } from "../types/api";

export type InvoiceFilterParams = {
  customerId?: number;
  search?: string;
  invoiceStatus?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
  outstandingFilter?: string;
  minAmount?: number | string;
  maxAmount?: number | string;
  categoryId?: number | string;
  createdByRole?: string;
  page?: number;
  size?: number;
};

export const getInvoicesPage = async (params?: InvoiceFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Invoice>>>("/v1/invoices", {
    params
  });
  return response.data.data;
};

export const getInvoices = async (params?: InvoiceFilterParams) => {
  const response = await getInvoicesPage(params);
  return response.records;
};

export const getInvoice = async (id: number) => {
  const response = await apiClient.get<ApiResponse<Invoice>>(`/v1/invoices/${id}`);
  return response.data.data;
};

export const createInvoice = async (payload: InvoiceRequest) => {
  const response = await apiClient.post<ApiResponse<Invoice>>("/v1/invoices", payload);
  return response.data.data;
};

export const updateInvoice = async (id: number, payload: InvoiceRequest) => {
  const response = await apiClient.put<ApiResponse<Invoice>>(`/v1/invoices/${id}`, payload);
  return response.data.data;
};

export const deleteInvoice = async (id: number) => {
  await apiClient.delete(`/v1/invoices/${id}`);
};

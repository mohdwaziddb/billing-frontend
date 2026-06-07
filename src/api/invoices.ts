import { apiClient } from "./apiClient";
import type { ApiResponse, Invoice, InvoiceRequest, PageResponse } from "../types/api";

export const getInvoicesPage = async (params?: { customerId?: number; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Invoice>>>("/v1/invoices", {
    params
  });
  return response.data.data;
};

export const getInvoices = async (params?: { customerId?: number; page?: number; size?: number }) => {
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

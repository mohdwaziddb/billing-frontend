import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, TaxMaster, TaxMasterRequest } from "../types/api";

export const getTaxMasterPage = async (params?: { search?: string; active?: boolean; taxType?: string; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<TaxMaster>>>("/v1/tax-master", { params });
  return response.data.data;
};

export const getTaxMasters = async (params?: { search?: string; active?: boolean; taxType?: string }) => {
  const response = await apiClient.get<ApiResponse<TaxMaster[]>>("/v1/tax-master/list", { params });
  return response.data.data;
};

export const getTaxMaster = async (id: number) => {
  const response = await apiClient.get<ApiResponse<TaxMaster>>(`/v1/tax-master/${id}`);
  return response.data.data;
};

export const createTaxMaster = async (payload: TaxMasterRequest) => {
  const response = await apiClient.post<ApiResponse<TaxMaster>>("/v1/tax-master", payload);
  return response.data.data;
};

export const updateTaxMaster = async (id: number, payload: TaxMasterRequest) => {
  const response = await apiClient.put<ApiResponse<TaxMaster>>(`/v1/tax-master/${id}`, payload);
  return response.data.data;
};

export const deleteTaxMaster = async (id: number) => {
  await apiClient.delete(`/v1/tax-master/${id}`);
};

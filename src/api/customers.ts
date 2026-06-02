import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  Customer,
  CustomerLedger,
  CustomerRequest
} from "../types/api";

export const getCustomers = async (params?: { search?: string; active?: boolean }) => {
  const response = await apiClient.get<ApiResponse<Customer[]>>("/v1/customers", {
    params
  });
  return response.data.data;
};

export const getCustomer = async (id: number) => {
  const response = await apiClient.get<ApiResponse<Customer>>(`/v1/customers/${id}`);
  return response.data.data;
};

export const getCustomerByMobile = async (mobile: string) => {
  const response = await apiClient.get<ApiResponse<Customer>>("/v1/customers/by-mobile", {
    params: { mobile }
  });
  return response.data.data;
};

export const createCustomer = async (payload: CustomerRequest) => {
  const response = await apiClient.post<ApiResponse<Customer>>("/v1/customers", payload);
  return response.data.data;
};

export const updateCustomer = async (id: number, payload: CustomerRequest) => {
  const response = await apiClient.put<ApiResponse<Customer>>(`/v1/customers/${id}`, payload);
  return response.data.data;
};

export const deleteCustomer = async (id: number) => {
  await apiClient.delete(`/v1/customers/${id}`);
};

export const getCustomerLedger = async (id: number) => {
  const response = await apiClient.get<ApiResponse<CustomerLedger>>(`/v1/customers/${id}/ledger`);
  return response.data.data;
};

export const getOutstandingCustomers = async () => {
  const response = await apiClient.get<ApiResponse<Customer[]>>("/v1/customers/outstanding");
  return response.data.data;
};

import { apiClient } from "./apiClient";
import type { ApiResponse, Product, ProductRequest } from "../types/api";

export const getProducts = async (params?: { search?: string; active?: boolean }) => {
  const response = await apiClient.get<ApiResponse<Product[]>>("/v1/products", {
    params
  });
  return response.data.data;
};

export const getProduct = async (id: number) => {
  const response = await apiClient.get<ApiResponse<Product>>(`/v1/products/${id}`);
  return response.data.data;
};

export const createProduct = async (payload: ProductRequest) => {
  const response = await apiClient.post<ApiResponse<Product>>("/v1/products", payload);
  return response.data.data;
};

export const updateProduct = async (id: number, payload: ProductRequest) => {
  const response = await apiClient.put<ApiResponse<Product>>(`/v1/products/${id}`, payload);
  return response.data.data;
};

export const deleteProduct = async (id: number) => {
  await apiClient.delete(`/v1/products/${id}`);
};

import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, ProductCategory, ProductCategoryRequest } from "../types/api";

export const getProductCategoriesPage = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<ProductCategory>>>("/v1/product-categories", {
    params
  });
  return response.data.data;
};

export const getProductCategories = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  const response = await getProductCategoriesPage(params);
  return response.records;
};

export const getProductCategory = async (id: number) => {
  const response = await apiClient.get<ApiResponse<ProductCategory>>(`/v1/product-categories/${id}`);
  return response.data.data;
};

export const createProductCategory = async (payload: ProductCategoryRequest) => {
  const response = await apiClient.post<ApiResponse<ProductCategory>>("/v1/product-categories", payload);
  return response.data.data;
};

export const updateProductCategory = async (id: number, payload: ProductCategoryRequest) => {
  const response = await apiClient.put<ApiResponse<ProductCategory>>(`/v1/product-categories/${id}`, payload);
  return response.data.data;
};

export const deleteProductCategory = async (id: number) => {
  await apiClient.delete(`/v1/product-categories/${id}`);
};

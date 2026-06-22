import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, ProductSubCategory, ProductSubCategoryRequest } from "../types/api";

export const getProductSubCategoriesPage = async (params?: { search?: string; active?: boolean; categoryId?: number; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<ProductSubCategory>>>("/v1/product-sub-categories", {
    params
  });
  return response.data.data;
};

export const getProductSubCategories = async (params?: { search?: string; active?: boolean; categoryId?: number; page?: number; size?: number }) => {
  const response = await getProductSubCategoriesPage(params);
  return response.records;
};

export const getProductSubCategory = async (id: number) => {
  const response = await apiClient.get<ApiResponse<ProductSubCategory>>(`/v1/product-sub-categories/${id}`);
  return response.data.data;
};

export const createProductSubCategory = async (payload: ProductSubCategoryRequest) => {
  const response = await apiClient.post<ApiResponse<ProductSubCategory>>("/v1/product-sub-categories", payload);
  return response.data.data;
};

export const updateProductSubCategory = async (id: number, payload: ProductSubCategoryRequest) => {
  const response = await apiClient.put<ApiResponse<ProductSubCategory>>(`/v1/product-sub-categories/${id}`, payload);
  return response.data.data;
};

export const deleteProductSubCategory = async (id: number) => {
  await apiClient.delete(`/v1/product-sub-categories/${id}`);
};

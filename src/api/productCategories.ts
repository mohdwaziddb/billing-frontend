import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, ProductCategory, ProductCategoryRequest } from "../types/api";

// Koi cache nahi: list hamesha server se live (price / stock / naam turant sahi dikhein).
// Pehle sessionStorage cache tab band hone tak purana data dikhata tha.
let activeProductCategoriesPromise: Promise<ProductCategory[]> | null = null;

const isActiveLookupRequest = (params?: { search?: string; active?: boolean; page?: number; size?: number }) =>
  !params?.search && params?.active === true && (params?.page === undefined || params.page === 0) && params?.size === 1000;

export const getProductCategoriesPage = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<ProductCategory>>>("/v1/product-categories", {
    params
  });
  return response.data.data;
};

export const getProductCategories = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  if (isActiveLookupRequest(params)) {
    if (!activeProductCategoriesPromise) {
      activeProductCategoriesPromise = getProductCategoriesPage(params)
        .then((response) => response.records)
        .finally(() => {
          activeProductCategoriesPromise = null;
        });
    }
    return activeProductCategoriesPromise;
  }
  const response = await getProductCategoriesPage(params);
  return response.records;
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

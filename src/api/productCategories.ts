import { apiClient } from "./apiClient";
import { sessionCache } from "../lib/sessionCache";
import type { ApiResponse, PageResponse, ProductCategory, ProductCategoryRequest } from "../types/api";

const ACTIVE_PRODUCT_CATEGORIES_CACHE_KEY = "billing_frontend_active_product_categories";
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
    const cached = sessionCache.get<ProductCategory[]>(ACTIVE_PRODUCT_CATEGORIES_CACHE_KEY);
    if (cached) {
      return cached;
    }
    if (!activeProductCategoriesPromise) {
      activeProductCategoriesPromise = getProductCategoriesPage(params)
        .then((response) => {
          sessionCache.set(ACTIVE_PRODUCT_CATEGORIES_CACHE_KEY, response.records);
          return response.records;
        })
        .finally(() => {
          activeProductCategoriesPromise = null;
        });
    }
    return activeProductCategoriesPromise;
  }
  const response = await getProductCategoriesPage(params);
  return response.records;
};

export const getProductCategory = async (id: number) => {
  const response = await apiClient.get<ApiResponse<ProductCategory>>(`/v1/product-categories/${id}`);
  return response.data.data;
};

export const createProductCategory = async (payload: ProductCategoryRequest) => {
  const response = await apiClient.post<ApiResponse<ProductCategory>>("/v1/product-categories", payload);
  sessionCache.clear(ACTIVE_PRODUCT_CATEGORIES_CACHE_KEY);
  return response.data.data;
};

export const updateProductCategory = async (id: number, payload: ProductCategoryRequest) => {
  const response = await apiClient.put<ApiResponse<ProductCategory>>(`/v1/product-categories/${id}`, payload);
  sessionCache.clear(ACTIVE_PRODUCT_CATEGORIES_CACHE_KEY);
  return response.data.data;
};

export const deleteProductCategory = async (id: number) => {
  await apiClient.delete(`/v1/product-categories/${id}`);
  sessionCache.clear(ACTIVE_PRODUCT_CATEGORIES_CACHE_KEY);
};

import { apiClient } from "./apiClient";
import { sessionCache } from "../lib/sessionCache";
import type { ApiResponse, PageResponse, Product, ProductRequest } from "../types/api";

const ACTIVE_PRODUCTS_CACHE_KEY = "billing_frontend_active_products";
let activeProductsPromise: Promise<Product[]> | null = null;

const isActiveLookupRequest = (params?: { search?: string; active?: boolean; page?: number; size?: number }) =>
  !params?.search && params?.active === true && (params?.page === undefined || params.page === 0) && params?.size === 1000;

export const getProductsPage = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Product>>>("/v1/products", {
    params
  });
  return response.data.data;
};

export const getProducts = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  if (isActiveLookupRequest(params)) {
    const cached = sessionCache.get<Product[]>(ACTIVE_PRODUCTS_CACHE_KEY);
    if (cached) {
      return cached;
    }
    if (!activeProductsPromise) {
      activeProductsPromise = getProductsPage(params)
        .then((response) => {
          sessionCache.set(ACTIVE_PRODUCTS_CACHE_KEY, response.records);
          return response.records;
        })
        .finally(() => {
          activeProductsPromise = null;
        });
    }
    return activeProductsPromise;
  }
  const response = await getProductsPage(params);
  return response.records;
};

export const getProduct = async (id: number) => {
  const response = await apiClient.get<ApiResponse<Product>>(`/v1/products/${id}`);
  return response.data.data;
};

export const createProduct = async (payload: ProductRequest) => {
  const response = await apiClient.post<ApiResponse<Product>>("/v1/products", payload);
  sessionCache.clear(ACTIVE_PRODUCTS_CACHE_KEY);
  return response.data.data;
};

export const updateProduct = async (id: number, payload: ProductRequest) => {
  const response = await apiClient.put<ApiResponse<Product>>(`/v1/products/${id}`, payload);
  sessionCache.clear(ACTIVE_PRODUCTS_CACHE_KEY);
  return response.data.data;
};

export const deleteProduct = async (id: number) => {
  await apiClient.delete(`/v1/products/${id}`);
  sessionCache.clear(ACTIVE_PRODUCTS_CACHE_KEY);
};

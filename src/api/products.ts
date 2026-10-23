import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, Product, ProductRequest } from "../types/api";

// Koi cache nahi: list hamesha server se live (price / stock / naam turant sahi dikhein).
// Pehle sessionStorage cache tab band hone tak purana data dikhata tha.
let activeProductsPromise: Promise<Product[]> | null = null;

const isActiveLookupRequest = (params?: { search?: string; active?: boolean; categoryId?: number; subCategoryId?: number; page?: number; size?: number }) =>
  !params?.search
  && params?.active === true
  && params?.categoryId === undefined
  && params?.subCategoryId === undefined
  && (params?.page === undefined || params.page === 0)
  && params?.size === 1000;

export const getProductsPage = async (params?: { search?: string; active?: boolean; categoryId?: number; subCategoryId?: number; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Product>>>("/v1/products", {
    params
  });
  return response.data.data;
};

export const getProducts = async (params?: { search?: string; active?: boolean; categoryId?: number; subCategoryId?: number; page?: number; size?: number }) => {
  if (isActiveLookupRequest(params)) {
    if (!activeProductsPromise) {
      activeProductsPromise = getProductsPage(params)
        .then((response) => response.records)
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
  const response = await apiClient.get<ApiResponse<Product>>(`/v1/products/${id}`, {
    pageLoaderBlocking: true
  });
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

export const deleteProductsBulk = async (ids: number[]) => {
  const response = await apiClient.delete<ApiResponse<{ deleted: number; failed: number; failures: Record<number, string> }>>(`/v1/products/bulk-delete`, { data: { ids } });
  return response.data.data;
};

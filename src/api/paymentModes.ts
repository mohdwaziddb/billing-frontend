import { apiClient } from "./apiClient";
import { sessionCache } from "../lib/sessionCache";
import type { ApiResponse, PageResponse, PaymentModeMaster, PaymentModeRequest } from "../types/api";

const ACTIVE_PAYMENT_MODES_CACHE_KEY = "billing_frontend_active_payment_modes";
let activePaymentModesPromise: Promise<PaymentModeMaster[]> | null = null;

type PaymentModeParams = {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
};

const isActiveLookupRequest = (params?: PaymentModeParams) =>
  !params?.search && params?.active === true && (params?.page === undefined || params.page === 0) && params?.size === 1000;

export const getPaymentModesPage = async (params?: PaymentModeParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<PaymentModeMaster>>>("/v1/payment-modes", { params });
  return response.data.data;
};

export const getPaymentModes = async (params?: PaymentModeParams) => {
  if (isActiveLookupRequest(params)) {
    const cached = sessionCache.get<PaymentModeMaster[]>(ACTIVE_PAYMENT_MODES_CACHE_KEY);
    if (cached) {
      return cached;
    }
    if (!activePaymentModesPromise) {
      activePaymentModesPromise = getPaymentModesPage(params)
        .then((response) => {
          sessionCache.set(ACTIVE_PAYMENT_MODES_CACHE_KEY, response.records);
          return response.records;
        })
        .finally(() => {
          activePaymentModesPromise = null;
        });
    }
    return activePaymentModesPromise;
  }
  const response = await getPaymentModesPage(params);
  return response.records;
};

export const createPaymentMode = async (payload: PaymentModeRequest) => {
  const response = await apiClient.post<ApiResponse<PaymentModeMaster>>("/v1/payment-modes", payload);
  sessionCache.clear(ACTIVE_PAYMENT_MODES_CACHE_KEY);
  return response.data.data;
};

export const updatePaymentMode = async (id: number, payload: PaymentModeRequest) => {
  const response = await apiClient.put<ApiResponse<PaymentModeMaster>>(`/v1/payment-modes/${id}`, payload);
  sessionCache.clear(ACTIVE_PAYMENT_MODES_CACHE_KEY);
  return response.data.data;
};

export const deletePaymentMode = async (id: number) => {
  await apiClient.delete(`/v1/payment-modes/${id}`);
  sessionCache.clear(ACTIVE_PAYMENT_MODES_CACHE_KEY);
};

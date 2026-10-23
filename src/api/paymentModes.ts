import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, PaymentModeMaster, PaymentModeRequest } from "../types/api";

// Koi cache nahi: payment modes hamesha server se live aate hain. Pehle sessionStorage
// cache tha jo tab band hone tak refresh nahi hota — server par modes badalne
// (migration / doosre user ka edit) ke baad bhi purane modes dikhte rehte the.
// Sirf ek hi waqt ki duplicate calls (ek screen par 2 component) ek request share karti hain.
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
    if (!activePaymentModesPromise) {
      activePaymentModesPromise = getPaymentModesPage(params)
        .then((response) => response.records)
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
  return response.data.data;
};

export const updatePaymentMode = async (id: number, payload: PaymentModeRequest) => {
  const response = await apiClient.put<ApiResponse<PaymentModeMaster>>(`/v1/payment-modes/${id}`, payload);
  return response.data.data;
};

export const deletePaymentMode = async (id: number) => {
  await apiClient.delete(`/v1/payment-modes/${id}`);
};

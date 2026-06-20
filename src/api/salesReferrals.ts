import { apiClient } from "./apiClient";
import type { ApiResponse, SalesReferralReport } from "../types/api";

export type SalesReferralParams = {
  startDate?: string;
  endDate?: string;
};

export const getSalesReferralReport = async (params?: SalesReferralParams) => {
  const response = await apiClient.get<ApiResponse<SalesReferralReport>>("/v1/sales-referrals/report", { params });
  return response.data.data;
};

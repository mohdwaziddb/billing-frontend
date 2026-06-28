import { apiClient } from "./apiClient";
import type { ApiResponse, GstReport } from "../types/api";

export type GstReportFilterParams = {
  startDate?: string;
  endDate?: string;
};

export const getGstSummaryReport = async (params?: GstReportFilterParams) => {
  const response = await apiClient.get<ApiResponse<GstReport>>("/v1/gst-reports/summary", { params });
  return response.data.data;
};

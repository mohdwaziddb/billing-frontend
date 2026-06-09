import { apiClient } from "./apiClient";
import type { ApiResponse, AuditLog, PageResponse } from "../types/api";

export const getAuditLogs = async (params: { moduleName: string; entityId: number; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<AuditLog>>>("/v1/audit-logs", { params });
  return response.data.data;
};

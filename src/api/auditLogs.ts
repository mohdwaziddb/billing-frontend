import { apiClient } from "./apiClient";
import type { ApiResponse, AuditLog, PageResponse } from "../types/api";

export type AuditLogFilterParams = {
  moduleName?: string;
  entityId?: number;
  userId?: number;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  size?: number;
};

export type AuditLogUserOption = {
  id: number;
  name: string;
};

export const getAuditLogs = async (params: AuditLogFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<AuditLog>>>("/v1/audit-logs", { params });
  return response.data.data;
};

export const getAuditLogUsers = async () => {
  const response = await apiClient.get<ApiResponse<AuditLogUserOption[]>>("/v1/audit-logs/users");
  return response.data.data;
};

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

export const getAuditLogs = async (params: AuditLogFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<AuditLog>>>("/v1/audit-logs", { params });
  return response.data.data;
};

// List pages "Show Logs": ek call me saare rows ka count (pehle har row ki alag call).
export const getAuditLogCounts = async (moduleName: string, entityIds: number[]) => {
  if (!entityIds.length) {
    return {} as Record<number, number>;
  }
  const response = await apiClient.get<ApiResponse<Record<string, number>>>("/v1/audit-logs/counts", {
    params: { moduleName, entityIds: entityIds.join(",") }
  });
  const counts: Record<number, number> = {};
  Object.entries(response.data.data ?? {}).forEach(([entityId, count]) => {
    counts[Number(entityId)] = Number(count) || 0;
  });
  return counts;
};

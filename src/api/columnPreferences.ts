import { apiClient } from "./apiClient";
import type { ApiResponse, TablePreference } from "../types/api";

export const getColumnPreference = async (tableName: string) => {
  const response = await apiClient.get<ApiResponse<TablePreference>>(`/v1/column-preferences/${encodeURIComponent(tableName)}`);
  return response.data.data;
};

export const saveColumnPreference = async (tableName: string, visibleColumns: string[]) => {
  const response = await apiClient.put<ApiResponse<TablePreference>>(`/v1/column-preferences/${encodeURIComponent(tableName)}`, { visibleColumns });
  return response.data.data;
};

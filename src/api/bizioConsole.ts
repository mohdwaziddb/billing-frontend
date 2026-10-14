import { apiClient } from "./apiClient";
import type { ApiResponse } from "../types/api";

export type BizioConsoleQueryResult = {
  databaseName: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  truncated: boolean;
  maxRows: number;
  executedInMs: number;
};

export type BizioConsoleTables = {
  databaseName: string;
  tables: string[];
  tableCount: number;
};

export const runBizioConsoleQuery = async (sql: string) => {
  const response = await apiClient.post<ApiResponse<BizioConsoleQueryResult>>("/v1/bizio-console/query", { sql });
  return response.data.data;
};

export const getBizioConsoleTables = async () => {
  const response = await apiClient.get<ApiResponse<BizioConsoleTables>>("/v1/bizio-console/tables");
  return response.data.data;
};

import { apiClient } from "./apiClient";
import type { ApiResponse, HierarchyNode } from "../types/api";

export type HierarchyFilters = {
  role?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  manager?: string;
};

export const getHierarchyRoots = async (params: HierarchyFilters) => {
  const response = await apiClient.get<ApiResponse<HierarchyNode[]>>("/v1/reports/management-hierarchy/roots", { params });
  return response.data.data;
};

export const getHierarchyChildren = async (parentId: number, params: HierarchyFilters) => {
  const response = await apiClient.get<ApiResponse<HierarchyNode[]>>(`/v1/reports/management-hierarchy/${parentId}/children`, { params });
  return response.data.data;
};

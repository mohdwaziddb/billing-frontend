import { apiClient } from "./apiClient";
import type { ApiResponse, CompanyUserRequest, PageResponse, UserProfile } from "../types/api";

export const getRoles = async () => {
  const response = await apiClient.get<ApiResponse<Array<"OWNER" | "ADMIN" | "USER">>>("/v1/roles");
  return response.data.data;
};

export const getCompanyUsersPage = async (params?: { page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<UserProfile>>>("/v1/users", { params });
  return response.data.data;
};

export const getCompanyUsers = async (params?: { page?: number; size?: number }) => {
  const response = await getCompanyUsersPage(params);
  return response.records;
};

export const createCompanyUser = async (payload: CompanyUserRequest) => {
  const response = await apiClient.post<ApiResponse<UserProfile>>("/v1/users", payload);
  return response.data.data;
};

export const updateCompanyUser = async (id: number, payload: CompanyUserRequest) => {
  const response = await apiClient.put<ApiResponse<UserProfile>>(`/v1/users/${id}`, payload);
  return response.data.data;
};

export const deactivateCompanyUser = async (id: number) => {
  await apiClient.delete(`/v1/users/${id}`);
};

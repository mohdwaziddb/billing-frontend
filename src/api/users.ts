import { apiClient } from "./apiClient";
import type { ApiResponse, CompanyUserRequest, PageResponse, Role, UserProfile } from "../types/api";

export type UserFilterParams = {
  page?: number;
  size?: number;
  name?: string;
  username?: string;
  mobileNumber?: string;
  email?: string;
  search?: string;
  role?: Role | "";
  active?: boolean | "";
};

export const getRoles = async () => {
  const response = await apiClient.get<ApiResponse<Array<"OWNER" | "ADMIN" | "USER">>>("/v1/roles");
  return response.data.data;
};

export const getCompanyUsersPage = async (params?: UserFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<UserProfile>>>("/v1/users", { params });
  return response.data.data;
};

export const getCompanyUsers = async (params?: UserFilterParams) => {
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

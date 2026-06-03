import { apiClient } from "./apiClient";
import type { ApiResponse, CompanyUserRequest, UserProfile } from "../types/api";

export const getCompanyUsers = async () => {
  const response = await apiClient.get<ApiResponse<UserProfile[]>>("/v1/users");
  return response.data.data;
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

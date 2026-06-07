import { apiClient } from "./apiClient";
import type { ApiResponse, PermissionMatrix, PermissionMatrixRequest, Role } from "../types/api";

export const getMyPermissions = async () => {
  const response = await apiClient.get<ApiResponse<PermissionMatrix>>("/v1/permissions/me");
  return response.data.data;
};

export const getMyMenus = async () => {
  const response = await apiClient.get<ApiResponse<PermissionMatrix>>("/v1/permissions/my-menus");
  return response.data.data;
};

export const getRolePermissionMatrix = async (roleCode: Role) => {
  const response = await apiClient.get<ApiResponse<PermissionMatrix>>("/v1/permissions/role-matrix", {
    params: { roleCode }
  });
  return response.data.data;
};

export const saveRolePermissionMatrix = async (payload: PermissionMatrixRequest) => {
  const response = await apiClient.post<ApiResponse<PermissionMatrix>>("/v1/permissions/role-matrix", payload);
  return response.data.data;
};

export const getUserPermissionMatrix = async (userId: number) => {
  const response = await apiClient.get<ApiResponse<PermissionMatrix>>("/v1/permissions/user-matrix", {
    params: { userId }
  });
  return response.data.data;
};

export const saveUserPermissionMatrix = async (payload: PermissionMatrixRequest) => {
  const response = await apiClient.post<ApiResponse<PermissionMatrix>>("/v1/permissions/user-matrix", payload);
  return response.data.data;
};

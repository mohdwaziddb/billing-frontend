  import { apiClient } from "./apiClient";
import type { ApiResponse, CompanyUserRequest, OwnProfileRequest, PageResponse, Role, UserProfile } from "../types/api";

const companyRoles: Role[] = ["OWNER", "ADMIN", "USER"];

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
  const response = await apiClient.get<ApiResponse<string[]>>("/v1/roles");
  const roles = response.data.data
    .map((role) => role.trim().toUpperCase())
    .filter((role): role is Role => companyRoles.includes(role as Role));
  return roles.length ? roles : companyRoles;
};

export const getCompanyUsersPage = async (params?: UserFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<UserProfile>>>("/v1/users", { params });
  return response.data.data;
};

export const getCompanyUsers = async (params?: UserFilterParams) => {
  const response = await getCompanyUsersPage(params);
  return response.records;
};

export const getActiveReferralUsers = async () => {
  const response = await apiClient.get<ApiResponse<UserProfile[]>>("/v1/users/active-referrers");
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

const photoForm = (photo: File) => {
  const formData = new FormData();
  formData.append("photo", photo);
  return formData;
};

/** Logged-in user apni profile (naam / email / mobile) khud badle. */
export const updateMyProfile = async (payload: OwnProfileRequest) => {
  const response = await apiClient.put<ApiResponse<UserProfile>>("/v1/users/me", payload);
  return response.data.data;
};

export const uploadMyPhoto = async (photo: File) => {
  const response = await apiClient.put<ApiResponse<UserProfile>>("/v1/users/me/photo", photoForm(photo), {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data.data;
};

export const deleteMyPhoto = async () => {
  const response = await apiClient.delete<ApiResponse<UserProfile>>("/v1/users/me/photo");
  return response.data.data;
};

/** Users page (owner): kisi bhi user ki photo. */
export const uploadUserPhoto = async (id: number, photo: File) => {
  const response = await apiClient.put<ApiResponse<UserProfile>>(`/v1/users/${id}/photo`, photoForm(photo), {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data.data;
};

export const deleteUserPhoto = async (id: number) => {
  const response = await apiClient.delete<ApiResponse<UserProfile>>(`/v1/users/${id}/photo`);
  return response.data.data;
};

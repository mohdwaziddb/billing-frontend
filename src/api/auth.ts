import { apiClient } from "./apiClient";
import type { ApiResponse, AuthPayload, UserProfile } from "../types/api";

export const loginRequest = async (payload: { username: string; password: string }) => {
  const response = await apiClient.post<ApiResponse<AuthPayload>>("/v1/auth/login", payload);
  return response.data.data;
};

export const registerRequest = async (payload: {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  taxId: string;
  adminFullName: string;
  adminMobileNumber: string;
  adminEmail: string;
  adminPassword: string;
}) => {
  const response = await apiClient.post<ApiResponse<AuthPayload>>("/v1/auth/register-company", payload);
  return response.data.data;
};

export const meRequest = async () => {
  const response = await apiClient.get<ApiResponse<UserProfile>>("/v1/users/me");
  return response.data.data;
};

export const logoutRequest = async (refreshToken: string) => {
  await apiClient.post("/v1/auth/logout", { refreshToken });
};

export const refreshTokenRequest = async (refreshToken: string) => {
  const response = await apiClient.post<ApiResponse<AuthPayload>>(
    "/v1/auth/refresh",
    { refreshToken },
    {
      skipAuthRefresh: true
    }
  );
  return response.data.data;
};

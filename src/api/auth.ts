import { apiClient } from "./apiClient";
import type { ApiResponse, AuthPayload, PlatformAdminAuthPayload, UserProfile } from "../types/api";

export const loginRequest = async (payload: { username: string; password: string }) => {
  const response = await apiClient.post<ApiResponse<AuthPayload>>("/v1/auth/login", payload);
  return response.data.data;
};

export const platformAdminLoginRequest = async (payload: { username: string; password: string }) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminAuthPayload>>("/v1/platform-admin/login", payload);
  return response.data.data;
};

export const meRequest = async () => {
  const response = await apiClient.get<ApiResponse<UserProfile>>("/v1/users/me");
  return response.data.data;
};

export const logoutRequest = async (refreshToken: string) => {
  await apiClient.post("/v1/auth/logout", { refreshToken });
};

export type PasswordResetChallenge = {
  challengeId: number | null;
  channel: string | null;
  maskedDestination: string | null;
  expiresInSeconds: number | null;
};

export const requestPasswordResetOtp = async (payload: { identifier: string; channel?: string }) => {
  const response = await apiClient.post<ApiResponse<PasswordResetChallenge>>("/v1/auth/forgot-password/request", payload);
  return response.data.data;
};

export const confirmPasswordResetOtp = async (payload: { challengeId: number; otp: string; newPassword: string }) => {
  await apiClient.post("/v1/auth/forgot-password/confirm", payload);
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

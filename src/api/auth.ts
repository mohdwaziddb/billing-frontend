import { apiClient } from "./apiClient";
import type { ApiResponse, AuthPayload, PlatformAdminAuthPayload, UserProfile } from "../types/api";

export const loginRequest = async (payload: { username: string; password: string }) => {
  const response = await apiClient.post<ApiResponse<AuthPayload>>("/v1/auth/login", payload);
  return response.data.data;
};

export const verifyMfaRequest = async (payload: { mfaToken: string; code: string }) => {
  const response = await apiClient.post<ApiResponse<AuthPayload>>("/v1/auth/mfa/verify", payload);
  return response.data.data;
};

export const platformAdminLoginRequest = async (payload: { username: string; password: string }) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminAuthPayload>>("/v1/platform-admin/login", payload);
  return response.data.data;
};

export const meRequest = async (options?: { skipPageLoader?: boolean }) => {
  const response = await apiClient.get<ApiResponse<UserProfile>>("/v1/users/me", {
    skipPageLoader: options?.skipPageLoader
  });
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

export const requestPasswordResetOtp = async (payload: { identifier: string }) => {
  const response = await apiClient.post<ApiResponse<PasswordResetChallenge>>("/v1/auth/forgot-password/request", payload);
  return response.data.data;
};

export const verifyPasswordResetOtp = async (payload: { challengeId: number; otp: string }) => {
  await apiClient.post("/v1/auth/forgot-password/verify", payload);
};

export const confirmPasswordResetOtp = async (payload: { challengeId: number; otp: string; newPassword: string; confirmPassword: string }) => {
  await apiClient.post("/v1/auth/forgot-password/confirm", payload);
};

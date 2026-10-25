import { apiClient } from "./apiClient";
import type { ApiResponse, UserSession } from "../types/api";

/** Apne devices (har logged-in user). */
export const getMySessions = async () => {
  const response = await apiClient.get<ApiResponse<UserSession[]>>("/v1/sessions/me");
  return response.data.data;
};

export const logoutMySession = async (sessionId: number) => {
  await apiClient.delete(`/v1/sessions/me/${sessionId}`);
};

export const logoutMyOtherSessions = async () => {
  const response = await apiClient.delete<ApiResponse<{ loggedOut: number }>>("/v1/sessions/me/others");
  return response.data.data.loggedOut;
};

/** Users page (USERS:EDIT): kisi bhi user ke devices. */
export const getUserSessions = async (userId: number) => {
  const response = await apiClient.get<ApiResponse<UserSession[]>>(`/v1/sessions/users/${userId}`);
  return response.data.data;
};

export const logoutUserSession = async (userId: number, sessionId: number) => {
  await apiClient.delete(`/v1/sessions/users/${userId}/${sessionId}`);
};

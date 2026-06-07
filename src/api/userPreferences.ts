import { apiClient } from "./apiClient";
import type { ApiResponse, UserPreference } from "../types/api";

export const getMyPreferences = async () => {
  const response = await apiClient.get<ApiResponse<UserPreference>>("/v1/user-preferences/me");
  return response.data.data;
};

export const updateMyPreferences = async (payload: UserPreference) => {
  const response = await apiClient.put<ApiResponse<UserPreference>>("/v1/user-preferences/me", payload);
  return response.data.data;
};

import { apiClient } from "./apiClient";
import type { ApiResponse, PlatformSettings } from "../types/api";

export const defaultPlatformSettings: PlatformSettings = {
  platformName: "",
  platformLogo: null,
  platformTagline: null
};

export const getPlatformSettings = async () => {
  const response = await apiClient.get<ApiResponse<PlatformSettings>>("/v1/platform-settings");
  return response.data.data;
};

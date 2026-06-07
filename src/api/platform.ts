import { apiClient } from "./apiClient";
import type { ApiResponse, PlatformSettings } from "../types/api";

export const defaultPlatformSettings: PlatformSettings = {
  platformName: "BizPulse Technologies",
  platformLogo: null,
  platformTagline: "Business Management Platform"
};

export const getPlatformSettings = async () => {
  const response = await apiClient.get<ApiResponse<PlatformSettings>>("/v1/platform-settings");
  return response.data.data;
};

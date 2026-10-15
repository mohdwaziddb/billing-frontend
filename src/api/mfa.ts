import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  CompanyMfaSettings,
  MfaSetupConfirmResult,
  MfaSetupStart,
  MfaStatus
} from "../types/api";

export const getMfaStatus = async () => {
  const response = await apiClient.get<ApiResponse<MfaStatus>>("/v1/mfa/status");
  return response.data.data;
};

export const startMfaSetup = async (deviceName: string) => {
  const response = await apiClient.post<ApiResponse<MfaSetupStart>>("/v1/mfa/setup/start", { deviceName });
  return response.data.data;
};

export const confirmMfaSetup = async (deviceName: string, code: string) => {
  const response = await apiClient.post<ApiResponse<MfaSetupConfirmResult>>("/v1/mfa/setup/confirm", {
    deviceName,
    code
  });
  return response.data.data;
};

export const deleteMfaDevice = async (deviceId: number) => {
  await apiClient.delete(`/v1/mfa/devices/${deviceId}`);
};

export const resetUserMfa = async (userId: number) => {
  const response = await apiClient.post<ApiResponse<{ userId: number; removedDevices: number; mfaEnabled: boolean }>>(
    "/v1/mfa/admin/reset",
    { userId }
  );
  return response.data.data;
};

export const getCompanyMfaSettings = async () => {
  const response = await apiClient.get<ApiResponse<CompanyMfaSettings>>("/v1/company/mfa");
  return response.data.data;
};

export const updateCompanyMfaSettings = async (applyMfa: boolean) => {
  const response = await apiClient.put<ApiResponse<CompanyMfaSettings>>("/v1/company/mfa", {
    isApplyMfa: applyMfa
  });
  return response.data.data;
};

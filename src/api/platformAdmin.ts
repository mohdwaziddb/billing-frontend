import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  PageResponse,
  PlatformAdminCompany,
  PlatformAdminCompanyDetails,
  PlatformAdminDashboardSummary,
  PlatformAdminDumpHistoryPage,
  PlatformAdminDumpMode,
  PlatformAdminDumpRequest,
  PlatformAdminDumpStats,
  PlatformAdminDumpValidation,
  PlatformAdminKnownDatabase,
  PlatformAdminSettings
} from "../types/api";

export type PlatformAdminCompanyFilters = {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
};

export type UpdatePlatformAdminSettingsPayload = {
  platformName?: string;
  platformTagline?: string;
  username?: string;
  password?: string;
  // Username/password badalne par backend current password maangta hai.
  currentPassword?: string;
};

export const getPlatformAdminDashboard = async () => {
  const response = await apiClient.get<ApiResponse<PlatformAdminDashboardSummary>>("/v1/platform-admin/dashboard");
  return response.data.data;
};

export const getPlatformAdminCompanies = async (params?: PlatformAdminCompanyFilters) => {
  const response = await apiClient.get<ApiResponse<PageResponse<PlatformAdminCompany>>>("/v1/platform-admin/companies", { params });
  return response.data.data;
};

export const activatePlatformAdminCompany = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/activate`);
  return response.data.data;
};

export const deactivatePlatformAdminCompany = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/deactivate`);
  return response.data.data;
};

export const enablePlatformAdminCompanyChatbot = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/chatbot/enable`);
  return response.data.data;
};

export const disablePlatformAdminCompanyChatbot = async (companyCode: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/chatbot/disable`);
  return response.data.data;
};

export const resetSuperAdminPassword = async (companyCode: string, password: string) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminCompany>>(`/v1/platform-admin/companies/${companyCode}/super-admin/reset`, { password });
  return response.data.data;
};

export const getPlatformAdminCompanyDetails = async (companyCode: string) => {
  const response = await apiClient.get<ApiResponse<PlatformAdminCompanyDetails>>(`/v1/platform-admin/companies/${companyCode}`, {
    pageLoaderBlocking: true
  });
  return response.data.data;
};

export const getPlatformAdminSettings = async () => {
  const response = await apiClient.get<ApiResponse<PlatformAdminSettings>>("/v1/platform-admin/settings");
  return response.data.data;
};

export const updatePlatformAdminSettings = async (payload: UpdatePlatformAdminSettingsPayload) => {
  const response = await apiClient.put<ApiResponse<PlatformAdminSettings>>("/v1/platform-admin/settings", payload);
  return response.data.data;
};

export const getDumpInstances = async () => {
  const response = await apiClient.get<ApiResponse<string[]>>("/v1/platform-admin/dumps/instances");
  return response.data.data;
};

export const getDumpDatabases = async () => {
  const response = await apiClient.get<ApiResponse<PlatformAdminKnownDatabase[]>>("/v1/platform-admin/dumps/databases");
  return response.data.data;
};

export const validateDumpDatabase = async (database: string, tables: string[]) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminDumpValidation>>("/v1/platform-admin/dumps/validate", { database, tables });
  return response.data.data;
};

export const queueDumpRequest = async (payload: { database: string; mode: PlatformAdminDumpMode; tables: string[] }) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminDumpRequest>>("/v1/platform-admin/dumps", payload);
  return response.data.data;
};

export const getDumpHistory = async (
  params?: { date?: string; status?: string; page?: number; size?: number },
  options?: { skipPageLoader?: boolean }
) => {
  const response = await apiClient.get<ApiResponse<PlatformAdminDumpHistoryPage>>("/v1/platform-admin/dumps", {
    params,
    skipPageLoader: options?.skipPageLoader
  });
  return response.data.data;
};

export const cancelDumpRequest = async (id: number) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminDumpRequest>>(`/v1/platform-admin/dumps/${id}/cancel`);
  return response.data.data;
};

export const retryDumpRequest = async (id: number) => {
  const response = await apiClient.post<ApiResponse<PlatformAdminDumpRequest>>(`/v1/platform-admin/dumps/${id}/retry`);
  return response.data.data;
};

export const deleteDumpRequest = async (id: number) => {
  const response = await apiClient.delete<ApiResponse<{ deleted: boolean; id: number }>>(`/v1/platform-admin/dumps/${id}`);
  return response.data.data;
};

export const getDumpStats = async (options?: { skipPageLoader?: boolean }) => {
  const response = await apiClient.get<ApiResponse<PlatformAdminDumpStats>>("/v1/platform-admin/dumps/stats", {
    skipPageLoader: options?.skipPageLoader
  });
  return response.data.data;
};

export const downloadDumpFile = async (id: number) => {
  const response = await apiClient.get(`/v1/platform-admin/dumps/${id}/file`, { responseType: "blob" });
  const disposition: string = response.headers?.["content-disposition"] ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const fileName = match?.[1] ?? `dump_${id}.sql`;
  const url = window.URL.createObjectURL(new Blob([response.data as BlobPart], { type: "application/sql" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return fileName;
};

/** Blob error bodies (file download failures) carry JSON — extract its message. */
export const readDumpDownloadError = async (err: unknown): Promise<string> => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: unknown };
      if (typeof parsed.message === "string" && parsed.message.length > 0) {
        return parsed.message;
      }
    } catch {
      // fall through to default message
    }
  }
  return "Unable to download dump file";
};


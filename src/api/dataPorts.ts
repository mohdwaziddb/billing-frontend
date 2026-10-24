import { apiClient } from "./apiClient";
import type { ApiResponse, DataPortModuleMeta, DataPortPreviewResponse, DataPortRow, ImportResult } from "../types/api";

// Saare DataPort modules ek hi API se: /v1/data-ports/{module}/...

export const getDataPortModules = async () => {
  const response = await apiClient.get<ApiResponse<DataPortModuleMeta[]>>("/v1/data-ports/modules");
  return response.data.data;
};

export const downloadDataPortSample = async (moduleKey: string) => {
  const response = await apiClient.get(`/v1/data-ports/${moduleKey}/sample`, {
    responseType: "blob"
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/i);
  return {
    blob: response.data as Blob,
    fileName: fileNameMatch?.[1] ?? `${moduleKey}-dataport-sample.xlsx`
  };
};

export const previewDataPort = async (moduleKey: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<ApiResponse<DataPortPreviewResponse>>(`/v1/data-ports/${moduleKey}/preview`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data.data;
};

// Edit ke baad server hi validate karta hai (duplicate, master exist, stock...) — frontend me rules dobara nahi likhe.
export const revalidateDataPort = async (moduleKey: string, rows: DataPortRow[], options?: { signal?: AbortSignal }) => {
  const response = await apiClient.post<ApiResponse<DataPortPreviewResponse>>(
    `/v1/data-ports/${moduleKey}/revalidate`,
    { rows: rows.map(({ rowNumber, values }) => ({ rowNumber, values })) },
    // Har edit par poore page ka loader na ghoome.
    { signal: options?.signal, skipPageLoader: true }
  );
  return response.data.data;
};

export const importDataPort = async (moduleKey: string, rows: DataPortRow[]) => {
  const response = await apiClient.post<ApiResponse<ImportResult>>(`/v1/data-ports/${moduleKey}/import`, {
    rows: rows.map(({ rowNumber, values }) => ({ rowNumber, values }))
  });
  return response.data.data;
};

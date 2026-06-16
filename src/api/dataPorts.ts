import { apiClient } from "./apiClient";
import type {
  ApiResponse,
  DataPortPreviewResponse,
  ImportResult,
  ProductDataPortReferenceData,
  ProductDataPortRow
} from "../types/api";

export const downloadProductDataPortSample = async () => {
  const response = await apiClient.get("/v1/data-ports/products/sample", {
    responseType: "blob"
  });
  const disposition = response.headers["content-disposition"] as string | undefined;
  const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/i);
  return {
    blob: response.data as Blob,
    fileName: fileNameMatch?.[1] ?? "product-dataport-sample.xlsx"
  };
};

export const previewProductDataPort = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post<ApiResponse<DataPortPreviewResponse<ProductDataPortRow, ProductDataPortReferenceData>>>(
    "/v1/data-ports/products/preview",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );
  return response.data.data;
};

export const importProductDataPort = async (rows: ProductDataPortRow[]) => {
  const response = await apiClient.post<ApiResponse<ImportResult>>("/v1/data-ports/products/import", {
    rows
  });
  return response.data.data;
};

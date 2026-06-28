import { apiClient } from "./apiClient";
import type { ApiResponse, StateMaster } from "../types/api";

export const getStates = async () => {
  const response = await apiClient.get<ApiResponse<StateMaster[]>>("/v1/states");
  return response.data.data;
};

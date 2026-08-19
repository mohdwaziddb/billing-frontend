import { apiClient } from "./apiClient";
import type { ApiResponse } from "../types/api";

export type AiChartPoint = {
  label: string;
  sales: number;
  collection: number;
};

export type AiChartData = {
  title: string;
  data: AiChartPoint[];
};

export type AiTableData = {
  title?: string;
  html: string;
};

export type AiChatReply = {
  reply: string;
  model?: string;
  chart?: AiChartData | null;
  table?: AiTableData | null;
};

type AiHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export const sendAiMessage = async (
  message: string,
  history: AiHistoryEntry[] = [],
  signal?: AbortSignal
) => {
  const response = await apiClient.post<ApiResponse<AiChatReply>>(
    "/v1/ai/chat",
    { message, history },
    { signal }
  );
  return response.data.data;
};
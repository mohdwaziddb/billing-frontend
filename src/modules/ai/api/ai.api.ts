import { apiClient } from "../../../api/apiClient";
import type { ApiResponse } from "../../../types/api";
import type { AiChatResponse } from "../types/ai.types";

export const sendAiMessage = async (message: string) => {
  const response = await apiClient.post<ApiResponse<AiChatResponse>>("/v1/ai/chat", {
    message,
    channel: "WEB"
  });
  return response.data.data;
};

export const confirmAiDraft = async (draftId: string) => {
  const response = await apiClient.post<ApiResponse<AiChatResponse>>("/v1/ai/chat/confirm", { draftId });
  return response.data.data;
};

export const cancelAiDraft = async (draftId: string) => {
  const response = await apiClient.post<ApiResponse<AiChatResponse>>("/v1/ai/chat/cancel", { draftId });
  return response.data.data;
};

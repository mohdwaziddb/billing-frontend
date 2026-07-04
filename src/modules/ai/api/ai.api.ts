import { apiClient } from "../../../api/apiClient";
import type { ApiResponse } from "../../../types/api";
import type { AiChatMessage, AiChatResponse } from "../types/ai.types";

export const sendAiMessage = async (message: string, history: AiChatMessage[] = []) => {
  const response = await apiClient.post<ApiResponse<AiChatResponse>>("/v1/ai/chat", {
    message,
    channel: "WEB",
    history: history.slice(-10).map((item) => ({
      role: item.role,
      content: item.content
    }))
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

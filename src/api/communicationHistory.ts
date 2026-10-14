import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse } from "../types/api";

export type CommunicationHistoryChannel = "mail" | "sms" | "whatsapp";

export type CommunicationHistoryItem = {
  id: number;
  channel: string;
  source: string;
  recipient: string;
  subject: string | null;
  message: string | null;
  status: string;
  errorMessage: string | null;
  providerName: string | null;
  messageId: string | null;
  sentBy: string | null;
  sentAt: string | null;
  createdAt: string | null;
};

export type CommunicationHistoryFilters = {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
};

export const getCommunicationHistory = async (channel: CommunicationHistoryChannel, params?: CommunicationHistoryFilters) => {
  const response = await apiClient.get<ApiResponse<PageResponse<CommunicationHistoryItem>>>(`/v1/communication-history/${channel}`, { params });
  return response.data.data;
};

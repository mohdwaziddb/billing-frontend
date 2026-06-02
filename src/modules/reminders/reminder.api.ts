import { apiClient } from "../../api/apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  OverdueCustomer,
  ReminderHistoryItem,
  SendReminderRequest
} from "./reminder.types";

export const getOverdueCustomers = async (params?: {
  search?: string;
  minBalance?: number;
  overdueDays?: number;
}) => {
  const response = await apiClient.get<ApiResponse<OverdueCustomer[]>>("/reminders/overdue-customers", {
    params
  });
  return response.data.data;
};

export const sendReminder = async (payload: SendReminderRequest) => {
  const response = await apiClient.post<ApiResponse<ReminderHistoryItem>>("/reminders/send", payload);
  return response.data.data;
};

export const getReminderHistory = async (customerId: number) => {
  const response = await apiClient.get<ApiResponse<ReminderHistoryItem[]>>(`/reminders/customer/${customerId}/history`);
  return response.data.data;
};

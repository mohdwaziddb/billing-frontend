import { apiClient } from "./apiClient";
import type { ApiResponse, Expense, ExpenseRequest, ExpenseType, PageResponse, ProfitLossReport, Profitability } from "../types/api";

export type ExpenseFilterParams = {
  search?: string;
  expenseType?: ExpenseType | string;
  categoryId?: number | string;
  customerId?: number | string;
  invoiceId?: number | string;
  startDate?: string;
  endDate?: string;
  createdByRole?: string;
  recordStatus?: "ACTIVE" | "DELETED" | "ALL";
  page?: number;
  size?: number;
};

export const getExpensesPage = async (params?: ExpenseFilterParams) => {
  const response = await apiClient.get<ApiResponse<PageResponse<Expense>>>("/v1/expenses", { params });
  return response.data.data;
};

// Expenses page ke KPI cards — backend SQL aggregate (pehle 1000 rows mangwa ke JS me jodte the).
export type ExpenseSummary = {
  total: number;
  thisMonth: number;
  today: number;
  category: number;
  categoryCount: number;
};

export const getExpenseSummary = async (params: { today: string; monthStart: string; categoryId?: number | string }) => {
  const response = await apiClient.get<ApiResponse<ExpenseSummary>>("/v1/expenses/summary", { params });
  return response.data.data;
};

export const createExpense = async (payload: ExpenseRequest) => {
  const response = await apiClient.post<ApiResponse<Expense>>("/v1/expenses", payload);
  return response.data.data;
};

export const updateExpense = async (id: number, payload: ExpenseRequest) => {
  const response = await apiClient.put<ApiResponse<Expense>>(`/v1/expenses/${id}`, payload);
  return response.data.data;
};

export const deleteExpense = async (id: number) => {
  await apiClient.delete(`/v1/expenses/${id}`);
};

export const getCustomerProfitability = async (customerId: number, params?: { startDate?: string; endDate?: string }) => {
  const response = await apiClient.get<ApiResponse<Profitability>>(`/v1/expenses/profitability/customer/${customerId}`, { params });
  return response.data.data;
};

export const getInvoiceProfitability = async (invoiceId: number) => {
  const response = await apiClient.get<ApiResponse<Profitability>>(`/v1/expenses/profitability/invoice/${invoiceId}`);
  return response.data.data;
};

export const getProfitLossReport = async (params?: ExpenseFilterParams) => {
  const response = await apiClient.get<ApiResponse<ProfitLossReport>>("/v1/expenses/reports/profit-loss", { params });
  return response.data.data;
};

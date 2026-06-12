import { apiClient } from "./apiClient";
import type { ApiResponse, ExpenseCategory, ExpenseCategoryRequest, PageResponse } from "../types/api";

export const getExpenseCategoriesPage = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  const response = await apiClient.get<ApiResponse<PageResponse<ExpenseCategory>>>("/v1/expense-categories", { params });
  return response.data.data;
};

export const getExpenseCategories = async (params?: { search?: string; active?: boolean; page?: number; size?: number }) => {
  const response = await getExpenseCategoriesPage(params);
  return response.records;
};

export const createExpenseCategory = async (payload: ExpenseCategoryRequest) => {
  const response = await apiClient.post<ApiResponse<ExpenseCategory>>("/v1/expense-categories", payload);
  return response.data.data;
};

export const updateExpenseCategory = async (id: number, payload: ExpenseCategoryRequest) => {
  const response = await apiClient.put<ApiResponse<ExpenseCategory>>(`/v1/expense-categories/${id}`, payload);
  return response.data.data;
};

export const deleteExpenseCategory = async (id: number) => {
  await apiClient.delete(`/v1/expense-categories/${id}`);
};

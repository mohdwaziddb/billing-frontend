import { apiClient } from "./apiClient";
import type { ApiResponse, PageResponse, Role, SuperAdminCompany, SuperAdminCompanyDetails, SuperAdminDashboardSummary, SuperAdminRevenueRow, SuperAdminUser } from "../types/api";

export type SuperAdminCompanyFilters = {
  search?: string;
  active?: boolean | "";
  page?: number;
  size?: number;
};

export type SuperAdminUserFilters = {
  companyId?: number;
  search?: string;
  role?: Exclude<Role, "SUPER_ADMIN"> | "";
  active?: boolean | "";
  page?: number;
  size?: number;
};

export type CreateSuperAdminCompanyPayload = {
  companyName: string;
  address: string;
  gstNumber: string;
  mobile: string;
  email: string;
  ownerName: string;
  ownerUsername: string;
  ownerEmail: string;
  ownerMobile: string;
  ownerPassword: string;
};

export type CreateSuperAdminUserPayload = {
  companyId: number;
  fullName: string;
  username: string;
  email: string;
  mobileNumber: string;
  password: string;
  role: Exclude<Role, "SUPER_ADMIN">;
  active: boolean;
};

export const getSuperAdminDashboard = async () => {
  const response = await apiClient.get<ApiResponse<SuperAdminDashboardSummary>>("/v1/super-admin/dashboard");
  return response.data.data;
};

export const getSuperAdminDashboardMetric = async (metric: string) => {
  const response = await apiClient.get<ApiResponse<Array<SuperAdminCompany | SuperAdminUser | SuperAdminRevenueRow>>>(`/v1/super-admin/dashboard/${metric}`);
  return response.data.data;
};

export const getSuperAdminCompanies = async (params?: SuperAdminCompanyFilters) => {
  const response = await apiClient.get<ApiResponse<PageResponse<SuperAdminCompany>>>("/v1/super-admin/companies", { params });
  return response.data.data;
};

export const createSuperAdminCompany = async (payload: CreateSuperAdminCompanyPayload) => {
  const response = await apiClient.post<ApiResponse<SuperAdminCompany>>("/v1/super-admin/companies", payload);
  return response.data.data;
};

export const activateSuperAdminCompany = async (companyId: number) => {
  const response = await apiClient.post<ApiResponse<SuperAdminCompany>>(`/v1/super-admin/companies/${companyId}/activate`);
  return response.data.data;
};

export const deactivateSuperAdminCompany = async (companyId: number) => {
  const response = await apiClient.post<ApiResponse<SuperAdminCompany>>(`/v1/super-admin/companies/${companyId}/deactivate`);
  return response.data.data;
};

export const getSuperAdminCompanyDetails = async (companyId: number) => {
  const response = await apiClient.get<ApiResponse<SuperAdminCompanyDetails>>(`/v1/super-admin/companies/${companyId}`);
  return response.data.data;
};

export const getSuperAdminUsers = async (params?: SuperAdminUserFilters) => {
  const response = await apiClient.get<ApiResponse<PageResponse<SuperAdminUser>>>("/v1/super-admin/users", { params });
  return response.data.data;
};

export const createSuperAdminUser = async (payload: CreateSuperAdminUserPayload) => {
  const response = await apiClient.post<ApiResponse<SuperAdminUser>>("/v1/super-admin/users", payload);
  return response.data.data;
};

import axios, { type InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { getApiErrorMessage } from "../lib/errors";
import { authStorage } from "../lib/storage";
import { notificationService } from "../services/notificationService";
import type { ApiResponse, AuthPayload } from "../types/api";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl
});

const refreshClient = axios.create({
  baseURL: env.apiBaseUrl
});

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const flushPendingRequests = (error: unknown, token?: string) => {
  pendingRequests.forEach((request) => {
    if (error) {
      request.reject(error);
      return;
    }
    request.resolve(token ?? "");
  });
  pendingRequests = [];
};

const clearSessionAndRedirect = () => {
  authStorage.clear();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const isAuthBypassRoute = (url?: string) => {
  if (!url) {
    return false;
  }
  return [
    "/v1/auth/login",
    "/v1/auth/register-company",
    "/v1/auth/forgot-password",
    "/v1/auth/logout",
    "/v1/auth/refresh"
  ].some((route) => url.includes(route));
};

apiClient.interceptors.request.use((config) => {
  if (isAuthBypassRoute(config.url)) {
    delete config.headers.Authorization;
    return config;
  }

  const auth = authStorage.get();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (status === 403) {
      notificationService.showError(getApiErrorMessage(error, "You do not have permission to access this resource"), error);
    } else if (error.message === "Network Error") {
      notificationService.showError("Unable to connect to the server. Please check your network connection.", error);
    }

    if (!originalRequest || status !== 401 || originalRequest.skipAuthRefresh || isAuthBypassRoute(originalRequest.url)) {
      if (status === 401 && (originalRequest?.skipAuthRefresh || originalRequest?.url?.includes("/v1/auth/refresh"))) {
        clearSessionAndRedirect();
      }
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    const auth = authStorage.get();
    if (!auth?.refreshToken) {
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (accessToken) => {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            resolve(apiClient(originalRequest));
          },
          reject
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await refreshClient.post<ApiResponse<AuthPayload>>(
        "/v1/auth/refresh",
        { refreshToken: auth.refreshToken }
      );
      const nextAuth = refreshResponse.data.data;
      authStorage.set(nextAuth);
      flushPendingRequests(null, nextAuth.accessToken);
      originalRequest.headers.Authorization = `Bearer ${nextAuth.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushPendingRequests(refreshError);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

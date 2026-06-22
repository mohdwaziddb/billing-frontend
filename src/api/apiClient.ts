import axios, { type InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { getApiErrorMessage } from "../lib/errors";
import { authStorage } from "../lib/storage";
import { notificationService } from "../services/notificationService";
import { ThemeBootstrapService } from "../services/ThemeBootstrapService";
import type { ApiResponse, AuthPayload, StoredAuthSession } from "../types/api";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
  }
}

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

export const PENDING_AUTH_TOAST_KEY = "billing_frontend_pending_auth_toast";

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

const getLoginPath = (session?: StoredAuthSession | null) => {
  if (session?.type === "platform-admin") {
    return "/platform-admin/login";
  }
  if (window.location.pathname.startsWith("/platform-admin")) {
    return "/platform-admin/login";
  }
  return "/login";
};

const clearSessionAndRedirect = (message?: string) => {
  const session = authStorage.get();
  const loginPath = getLoginPath(session);
  authStorage.clear();
  try {
    sessionStorage.clear();
    if (message) {
      sessionStorage.setItem(PENDING_AUTH_TOAST_KEY, message);
    }
  } catch {
    // Ignore session storage errors in private / restricted browser modes.
  }
  ThemeBootstrapService.clear();
  if (window.location.pathname !== loginPath) {
    window.location.href = loginPath;
  }
};

const isCompanyInactiveResponse = (error: any) => {
  const message = error?.response?.data?.message;
  return error?.response?.status === 403 && typeof message === "string" && message.trim() === "Company is inactive";
};

const isAuthBypassRoute = (url?: string) => {
  if (!url) {
    return false;
  }
  return [
    "/v1/auth/login",
    "/v1/auth/forgot-password",
    "/v1/auth/logout",
    "/v1/auth/refresh",
    "/v1/platform-admin/login",
    "/v1/platform-settings"
  ].some((route) => url.includes(route));
};

apiClient.interceptors.request.use((config) => {
  if (isAuthBypassRoute(config.url)) {
    delete config.headers.Authorization;
    return config;
  }

  const session = authStorage.get();
  if (session?.auth.accessToken) {
    config.headers.Authorization = `Bearer ${session.auth.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (isCompanyInactiveResponse(error)) {
      const message = "Company is inactive. Please contact administrator.";
      notificationService.showError(message, error);
      clearSessionAndRedirect(message);
      return Promise.reject(error);
    }

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

    const session = authStorage.get();
    if (!session || session.type !== "user" || !session.auth.refreshToken) {
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
        { refreshToken: session.auth.refreshToken }
      );
      const nextAuth = refreshResponse.data.data;
      authStorage.set({ type: "user", auth: nextAuth });
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

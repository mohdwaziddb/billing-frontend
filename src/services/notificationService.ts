export type NotificationType = "success" | "error" | "warning" | "info";

export type AppNotification = {
  id: number;
  type: NotificationType;
  message: string;
  error?: unknown;
};

type Listener = (notification: AppNotification) => void;

const listeners = new Set<Listener>();
let nextId = 1;
const ERROR_DEDUPE_MS = 4000;
const recentErrorKeys = new Map<string, number>();

const permissionDeniedMessage = "You do not have permission to access this resource";

const getStatus = (error: unknown) => (error as any)?.response?.status;

const normalizeErrorKey = (message: string, error?: unknown) => {
  const status = getStatus(error);
  const normalizedMessage = message.trim().toLowerCase();
  if (status === 403 || /permission|access this resource|access denied|forbidden/.test(normalizedMessage)) {
    return "permission-denied";
  }
  if (status === 0 || normalizedMessage.includes("network") || (error as any)?.message === "Network Error") {
    return "network-error";
  }
  return `${status ?? "app"}:${normalizedMessage}`;
};

const shouldSuppressError = (message: string, error?: unknown) => {
  const now = Date.now();
  const key = normalizeErrorKey(message, error);
  const lastShownAt = recentErrorKeys.get(key) ?? 0;
  if (now - lastShownAt < ERROR_DEDUPE_MS) {
    return true;
  }
  recentErrorKeys.set(key, now);
  return false;
};

/**
 * Strip credential material before anything reaches console/toast state.
 * apiClient passes full axios errors (config.headers.Authorization Bearer
 * token, refreshToken bodies) — logging those raw prints live session
 * tokens to any open DevTools console.
 */
const sanitizeForLog = (error: unknown): unknown => {
  if (!error || typeof error !== "object") {
    return error;
  }
  const axiosError = error as {
    config?: Record<string, unknown>;
    response?: { data?: unknown; status?: unknown };
    message?: unknown;
  };
  if (!axiosError.config && !axiosError.response) {
    return error;
  }
  const config = axiosError.config ? { ...axiosError.config } : undefined;
  if (config) {
    const headers = (config.headers ?? {}) as Record<string, unknown>;
    const cleanHeaders = { ...headers };
    for (const key of Object.keys(cleanHeaders)) {
      if (key.toLowerCase() === "authorization") {
        cleanHeaders[key] = "[REDACTED]";
      }
    }
    config.headers = cleanHeaders;
    const data = config.data as unknown;
    if (typeof data === "string") {
      config.data = data.replace(/"(refreshToken|password|otp|newPassword)"\s*:\s*"[^"]*"/g, '"$1":"[REDACTED]"');
    } else if (data && typeof data === "object") {
      const cleanData = { ...(data as Record<string, unknown>) };
      for (const key of ["refreshToken", "password", "otp", "newPassword"]) {
        if (key in cleanData) {
          cleanData[key] = "[REDACTED]";
        }
      }
      config.data = cleanData;
    }
  }
  return {
    message: axiosError.message,
    status: axiosError.response?.status,
    data: axiosError.response?.data,
    config
  };
};

const emit = (type: NotificationType, message: string, error?: unknown) => {
  if (type === "error" && shouldSuppressError(message, error)) {
    return;
  }
  const notification = { id: nextId++, type, message, error };
  if (type === "error" && error) {
    console.error(message, sanitizeForLog(error));
  }
  listeners.forEach((listener) => listener(notification));
};

export const notificationService = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  showSuccess(message: string) {
    emit("success", message);
  },
  showError(message: string, error?: unknown) {
    emit("error", message, error);
  },
  handlePermissionDenied() {
    emit("error", permissionDeniedMessage);
  },
  showWarning(message: string) {
    emit("warning", message);
  },
  showInfo(message: string) {
    emit("info", message);
  }
};

export const showSuccess = notificationService.showSuccess;
export const showError = notificationService.showError;
export const handlePermissionDenied = notificationService.handlePermissionDenied;
export const showWarning = notificationService.showWarning;
export const showInfo = notificationService.showInfo;

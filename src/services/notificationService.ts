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

const emit = (type: NotificationType, message: string, error?: unknown) => {
  if (type === "error" && shouldSuppressError(message, error)) {
    return;
  }
  const notification = { id: nextId++, type, message, error };
  if (type === "error" && error) {
    console.error(message, error);
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

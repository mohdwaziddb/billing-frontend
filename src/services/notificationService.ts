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

const emit = (type: NotificationType, message: string, error?: unknown) => {
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
  showWarning(message: string) {
    emit("warning", message);
  },
  showInfo(message: string) {
    emit("info", message);
  }
};

export const showSuccess = notificationService.showSuccess;
export const showError = notificationService.showError;
export const showWarning = notificationService.showWarning;
export const showInfo = notificationService.showInfo;

import { useState } from "react";
import { getApiErrorMessage, getFieldErrors } from "../lib/errors";
import { notificationService } from "../services/notificationService";

export const useApiMessage = () => {
  const [message, setMessage] = useState("");

  return {
    message,
    setMessage,
    clearMessage() {
      setMessage("");
    },
    setApiError(error: unknown, fallback: string) {
      const message = getApiErrorMessage(error, fallback);
      setMessage(message);
      notificationService.showError(message, error);
    }
  };
};

export const useApiFormFeedback = () => {
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  return {
    message,
    fieldErrors,
    setMessage,
    setFieldErrors,
    clearFeedback() {
      setMessage("");
      setFieldErrors({});
    },
    clearFieldError(field: string) {
      setFieldErrors((current) => {
        if (!current[field]) {
          return current;
        }
        const next = { ...current };
        delete next[field];
        return next;
      });
    },
    applyApiError(error: unknown, fallback: string) {
      const nextFieldErrors = getFieldErrors(error);
      setFieldErrors(nextFieldErrors);

      if (Object.keys(nextFieldErrors).length > 0) {
        const firstError = Object.values(nextFieldErrors)[0];
        const message = typeof firstError === "string" ? firstError : "Please fix the highlighted fields";
        setMessage(message);
        notificationService.showError(message, error);
        return;
      }

      const message = getApiErrorMessage(error, fallback);
      setMessage(message);
      notificationService.showError(message, error);
    }
  };
};

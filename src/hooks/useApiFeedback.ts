import { useCallback, useState } from "react";
import { getApiErrorMessage, getFieldErrors } from "../lib/errors";
import { notificationService } from "../services/notificationService";

export const useApiMessage = () => {
  const [message, setMessage] = useState("");
  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);
  const setApiError = useCallback((error: unknown, fallback: string) => {
    const message = getApiErrorMessage(error, fallback);
    setMessage("");
    notificationService.showError(message, error);
  }, []);

  return {
    message,
    setMessage,
    clearMessage,
    setApiError
  };
};

export const useApiFormFeedback = () => {
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const clearFeedback = useCallback(() => {
    setMessage("");
    setFieldErrors({});
  }, []);
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);
  const applyApiError = useCallback((error: unknown, fallback: string) => {
    const nextFieldErrors = getFieldErrors(error);
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      const firstError = Object.values(nextFieldErrors)[0];
      const message = typeof firstError === "string" ? firstError : "Please fix the highlighted fields";
      setMessage("");
      notificationService.showError(message, error);
      return;
    }

    const message = getApiErrorMessage(error, fallback);
    setMessage("");
    notificationService.showError(message, error);
  }, []);

  return {
    message,
    fieldErrors,
    setMessage,
    setFieldErrors,
    clearFeedback,
    clearFieldError,
    applyApiError
  };
};

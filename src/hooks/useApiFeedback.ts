import { useState } from "react";
import { getApiErrorMessage, getFieldErrors } from "../lib/errors";

export const useApiMessage = () => {
  const [message, setMessage] = useState("");

  return {
    message,
    setMessage,
    clearMessage() {
      setMessage("");
    },
    setApiError(error: unknown, fallback: string) {
      setMessage(getApiErrorMessage(error, fallback));
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
        setMessage(typeof firstError === "string" ? firstError : "Please fix the highlighted fields");
        return;
      }

      setMessage(getApiErrorMessage(error, fallback));
    }
  };
};

export const getFieldErrors = (error: unknown): Record<string, string> => {
  const data = (error as any)?.response?.data?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === "string" && value.trim()) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const fieldErrors = getFieldErrors(error);
  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) {
    return firstFieldError;
  }

  const responseMessage = (error as any)?.response?.data?.message;
  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  const directMessage = (error as any)?.message;
  if (typeof directMessage === "string" && directMessage.trim() && directMessage !== "Network Error") {
    return directMessage;
  }

  return fallback;
};

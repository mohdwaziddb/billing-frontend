const getEnv = (key: "VITE_API_BASE_URL" | "VITE_APP_ENV", fallback: string) => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};

export const env = {
  apiBaseUrl: getEnv("VITE_API_BASE_URL", "http://localhost:8080/api"),
  appEnv: getEnv("VITE_APP_ENV", "local")
} as const;

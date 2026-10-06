import { ThemeBootstrapService } from "../services/ThemeBootstrapService";
import { sessionCache } from "./sessionCache";
import { authStorage } from "./storage";

export const AUTH_BOOTSTRAP_CACHE_KEY = "billing_frontend_auth_bootstrap";
export const MAINTENANCE_CODES = new Set(["TENANT_INACTIVE", "TENANT_UNAVAILABLE"]);
export const MAINTENANCE_EVENT = "bizio:tenant-maintenance";

export const isTenantSubdomainHost = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return false;
  // Live tenant subdomains AND local-dev subdomains (sample.localhost).
  if (host.endsWith(".localhost")) return true;
  if (host === "biziotechnologies.com" || host === "www.biziotechnologies.com") return false;
  return host.endsWith(".biziotechnologies.com");
};

export const isMaintenanceError = (err: unknown) => {
  const status = (err as any)?.response?.status;
  if (status !== 503) {
    return false;
  }
  const code = (err as any)?.response?.data?.code;
  return code == null || MAINTENANCE_CODES.has(code);
};

/**
 * Park the tenant on the static maintenance screen WITHOUT changing the
 * URL: clears the session and tells App (via event) to render
 * MaintenancePage in place of whatever route is open.
 */
export const notifyMaintenance = () => {
  try {
    authStorage.clear();
  } catch {
    // Ignore storage errors in private / restricted browser modes.
  }
  try {
    sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
  } catch {
    // Ignore storage errors in private / restricted browser modes.
  }
  try {
    sessionStorage.clear();
  } catch {
    // Ignore session storage errors in private / restricted browser modes.
  }
  try {
    ThemeBootstrapService.clear();
  } catch {
    // Ignore theme reset errors.
  }
  try {
    window.dispatchEvent(new Event(MAINTENANCE_EVENT));
  } catch {
    // Ignore dispatch errors (non-browser contexts).
  }
};

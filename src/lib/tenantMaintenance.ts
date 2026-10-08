import { ThemeBootstrapService } from "../services/ThemeBootstrapService";
import { sessionCache } from "./sessionCache";
import { isTenantSubdomainHost as isTenantHost, tenantKeySuffix } from "./hosts";
import { authStorage } from "./storage";

export const AUTH_BOOTSTRAP_CACHE_KEY = `billing_frontend_auth_bootstrap${tenantKeySuffix()}`;
export const MAINTENANCE_CODES = new Set(["TENANT_INACTIVE", "TENANT_UNAVAILABLE"]);
export const MAINTENANCE_EVENT = "bizio:tenant-maintenance";

// Single shared host helper lives in ./hosts — re-exported here so existing
// imports keep working. New code should import from ./hosts directly.
export const isTenantSubdomainHost = (host?: string): boolean =>
  host === undefined ? isTenantHost() : isTenantHost(host);

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

import { pageLoadingService } from "../services/pageLoadingService";
import { ThemeBootstrapService } from "../services/ThemeBootstrapService";
import { sessionCache } from "./sessionCache";
import { tenantKeySuffix } from "./hosts";
import { authStorage } from "./storage";

const AUTH_BOOTSTRAP_CACHE_KEY = `billing_frontend_auth_bootstrap${tenantKeySuffix()}`;
const MAINTENANCE_CODES = new Set(["TENANT_INACTIVE", "TENANT_UNAVAILABLE"]);
export const MAINTENANCE_EVENT = "bizio:tenant-maintenance";
export const INVALID_URL_EVENT = "bizio:tenant-invalid-url";

export const isMaintenanceError = (err: unknown) => {
  const status = (err as any)?.response?.status;
  if (status !== 503) {
    return false;
  }
  const code = (err as any)?.response?.data?.code;
  return code == null || MAINTENANCE_CODES.has(code);
};

// Dono full-screen states (maintenance / invalid URL) ke liye common reset:
// stale session, cached bootstrap, per-tab storage aur theme sab saaf.
const clearTenantState = () => {
  pageLoadingService.reset();
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
};

const emit = (eventName: string) => {
  try {
    window.dispatchEvent(new Event(eventName));
  } catch {
    // Ignore dispatch errors (non-browser contexts).
  }
};

/**
 * Park the tenant on the static status screen WITHOUT changing the URL:
 * clears the session and tells App (via event) to render the maintenance
 * notice in place of whatever route is open.
 */
export const notifyMaintenance = () => {
  clearTenantState();
  emit(MAINTENANCE_EVENT);
};

/**
 * Ghost tenant (unknown subdomain, backend 404): same in-place treatment —
 * clears stale state and tells App to render the invalid URL notice on the
 * same URL instead of redirecting anywhere.
 */
export const notifyInvalidUrl = () => {
  clearTenantState();
  emit(INVALID_URL_EVENT);
};

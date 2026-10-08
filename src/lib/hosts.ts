import {
  LOCALHOST,
  LOCAL_LOOPBACK,
  MAIN_DOMAIN,
  MAIN_SITE_URL,
  WWW_LOCALHOST,
  WWW_MAIN_HOST
} from "../config/site";

/**
 * Single source of truth for host-based routing.
 *
 * Live and local share one mental model:
 * - MAIN hosts show the marketing LandingPage on "/":
 *   localhost/127.0.0.1/www.localhost (local) and the main domain (live).
 *   User login NEVER happens here — login belongs to tenant subdomains.
 * - TENANT subdomain hosts show the tenant LoginPage on "/":
 *   <tenant>.localhost (local) and <tenant>.<MAIN_DOMAIN> (live).
 *
 * Domain strings yaha hardcode nahi — sab config/site.ts se aate hai.
 * Har file (App, apiClient, LoginPage, tenantMaintenance) yahi se import kare.
 * Do NOT duplicate these checks anywhere else.
 */

const MAIN_HOSTS = new Set([
  LOCALHOST,
  LOCAL_LOOPBACK,
  WWW_LOCALHOST,
  MAIN_DOMAIN,
  WWW_MAIN_HOST
]);

const LIVE_TENANT_SUFFIX = `.${MAIN_DOMAIN}`;
const LOCAL_TENANT_SUFFIX = ".localhost";

const RESERVED_SUBDOMAINS = new Set(["www", MAIN_DOMAIN.split(".")[0], "localhost"]);

export const currentHostname = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.hostname.toLowerCase();
};

const normalize = (host: string): string => {
  const value = (host || "").toLowerCase().trim();
  const withoutPort = value.split(":")[0];
  return withoutPort.replace(/\.+$/, "");
};

/** True on main hosts (landing page). Defaults to current window hostname. */
export const isMainHost = (host: string = currentHostname()): boolean => {
  const normalized = normalize(host);
  if (!normalized) {
    return false;
  }
  return MAIN_HOSTS.has(normalized);
};

/** True only on live main-domain hosts (used for live-only redirects). */
export const isLiveHost = (host: string = currentHostname()): boolean => {
  const normalized = normalize(host);
  if (!normalized) {
    return false;
  }
  return normalized === MAIN_DOMAIN || normalized.endsWith(LIVE_TENANT_SUFFIX);
};

/** True on tenant subdomain hosts (login page + maintenance probe). */
export const isTenantSubdomainHost = (host: string = currentHostname()): boolean => {
  const normalized = normalize(host);
  if (!normalized || isMainHost(normalized)) {
    return false;
  }
  if (normalized.endsWith(LOCAL_TENANT_SUFFIX)) {
    return true;
  }
  return normalized.endsWith(LIVE_TENANT_SUFFIX);
};

/**
 * Tenant company code derived from the subdomain, or null on main/unknown hosts.
 * "www" and reserved labels are never treated as tenant codes.
 */
export const getSubdomainCompanyCode = (host: string = currentHostname()): string | null => {
  const normalized = normalize(host);
  if (!normalized || isMainHost(normalized)) {
    return null;
  }
  let suffix = "";
  if (normalized.endsWith(LOCAL_TENANT_SUFFIX)) {
    suffix = LOCAL_TENANT_SUFFIX;
  } else if (normalized.endsWith(LIVE_TENANT_SUFFIX)) {
    suffix = LIVE_TENANT_SUFFIX;
  } else {
    return null;
  }
  const sub = normalized.slice(0, -suffix.length).split(".")[0];
  if (!sub || RESERVED_SUBDOMAINS.has(sub)) {
    return null;
  }
  return sub;
};

/**
 * Storage key suffix for the current tenant ("" on main hosts).
 * Same origin can serve different tenants in local dev (tenant comes from
 * the subdomain), so tenant-scoped caches must not share one key —
 * otherwise tenant B's login briefly wears tenant A's theme/session.
 * Computed once per page load: changing tenant always reloads the page.
 */
export const tenantKeySuffix = (host: string = currentHostname()): string => {
  const code = getSubdomainCompanyCode(host);
  return code ? `:${code.toLowerCase()}` : "";
};

/**
 * Main-site home URL for THIS environment — the redirect target for unknown
 * subdomains. Live hosts go to the live main site; local hosts go to the
 * local main (same protocol + running port, never hardcoded) so a dev server
 * on any port (5173/4173/...) redirects correctly and never to the live site.
 */
export const mainSiteHomeUrl = (host: string = currentHostname()): string => {
  if (isLiveHost(host)) {
    return MAIN_SITE_URL;
  }
  if (typeof window === "undefined") {
    return MAIN_SITE_URL;
  }
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${LOCALHOST}${port}/`;
};

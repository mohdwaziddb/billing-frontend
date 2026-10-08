import type { StoredAuthSession } from "../types/api";
import { tenantKeySuffix } from "./hosts";

// Tenant-suffixed on subdomain hosts (":test"), shared on main hosts.
// Old unsuffixed sessions are simply not found -> user logs in again once.
const AUTH_KEY = `billing_frontend_auth${tenantKeySuffix()}`;
const PLATFORM_ADMIN_COLUMN_PREFS_KEY = "billing_frontend_platform_admin_column_prefs";

export const authStorage = {
  get(): StoredAuthSession | null {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredAuthSession) : null;
  },
  set(value: StoredAuthSession) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(value));
  },
  clear() {
    localStorage.removeItem(AUTH_KEY);
  }
};

export const platformAdminColumnPrefsStorage = {
  get(tableName: string): string[] | null {
    try {
      const raw = localStorage.getItem(PLATFORM_ADMIN_COLUMN_PREFS_KEY);
      if (!raw) {
        return null;
      }
      const prefs = JSON.parse(raw) as Record<string, string[]>;
      return Array.isArray(prefs[tableName]) ? prefs[tableName] : null;
    } catch {
      return null;
    }
  },
  set(tableName: string, columns: string[]) {
    try {
      const raw = localStorage.getItem(PLATFORM_ADMIN_COLUMN_PREFS_KEY);
      const prefs = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
      prefs[tableName] = columns;
      localStorage.setItem(PLATFORM_ADMIN_COLUMN_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors in private / restricted browser modes.
    }
  },
  clear() {
    try {
      localStorage.removeItem(PLATFORM_ADMIN_COLUMN_PREFS_KEY);
    } catch {
      // Ignore storage errors in private / restricted browser modes.
    }
  }
};

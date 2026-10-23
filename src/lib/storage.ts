import type { StoredAuthSession } from "../types/api";
import { tenantKeySuffix } from "./hosts";

// Tenant-suffixed on subdomain hosts (":test"), shared on main hosts.
// Old unsuffixed sessions are simply not found -> user logs in again once.
const AUTH_KEY = `billing_frontend_auth${tenantKeySuffix()}`;
const PLATFORM_ADMIN_COLUMN_PREFS_KEY = "billing_frontend_platform_admin_column_prefs";

// apiClient token refresh ke baad fire hota hai; AuthContext isse React state
// sync karta hai, warna purane state se stale tokens wapas storage me likhe jaate.
export const AUTH_SESSION_REFRESHED_EVENT = "billing:auth-session-refreshed";

export const REMEMBER_ME_KEY = "billing_frontend_remember_me";

// "Remember me" off: session sirf is tab tak (sessionStorage, tab band = logout).
// Default ON, taaki pehle se logged-in users achanak logout na hon.
export const isRememberMe = () => {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) !== "0";
  } catch {
    return true;
  }
};

const readSession = (storage: Storage): StoredAuthSession | null => {
  try {
    const raw = storage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as StoredAuthSession) : null;
  } catch {
    // Corrupt/hand-edited value se poora app crash hota tha: bas session nahi maano.
    return null;
  }
};

export const authStorage = {
  get(): StoredAuthSession | null {
    return readSession(localStorage) ?? readSession(sessionStorage);
  },
  set(value: StoredAuthSession) {
    const target = isRememberMe() ? localStorage : sessionStorage;
    const other = target === localStorage ? sessionStorage : localStorage;
    try {
      other.removeItem(AUTH_KEY);
    } catch {
      // Ignore storage errors in private / restricted browser modes.
    }
    target.setItem(AUTH_KEY, JSON.stringify(value));
  },
  clear() {
    try {
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      // Ignore storage errors in private / restricted browser modes.
    }
  },
  key: AUTH_KEY
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

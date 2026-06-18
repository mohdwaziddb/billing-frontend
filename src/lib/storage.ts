import type { StoredAuthSession } from "../types/api";

const AUTH_KEY = "billing_frontend_auth";

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

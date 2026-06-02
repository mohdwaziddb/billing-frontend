import type { AuthPayload } from "../types/api";

const AUTH_KEY = "billing_saas_auth";

export const authStorage = {
  get(): AuthPayload | null {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthPayload) : null;
  },
  set(value: AuthPayload) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(value));
  },
  clear() {
    localStorage.removeItem(AUTH_KEY);
  }
};

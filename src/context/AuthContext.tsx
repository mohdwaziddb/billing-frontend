import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loginRequest, logoutRequest, meRequest, registerRequest } from "../api/auth";
import { authStorage } from "../lib/storage";
import type { AuthPayload, UserProfile } from "../types/api";

type AuthContextValue = {
  auth: AuthPayload | null;
  user: UserProfile | null;
  login: (payload: { username: string; password: string }) => Promise<void>;
  register: (payload: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    taxId: string;
    adminFullName: string;
    adminMobileNumber: string;
    adminEmail: string;
    adminPassword: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthPayload | null>(authStorage.get());
  const [user, setUser] = useState<UserProfile | null>(authStorage.get()?.user ?? null);

  useEffect(() => {
    if (!auth?.accessToken) {
      setUser(null);
      return;
    }
    meRequest()
      .then(setUser)
      .catch(() => {
        authStorage.clear();
        setAuth(null);
        setUser(null);
      });
  }, [auth?.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      user,
      async login(payload) {
        const nextAuth = await loginRequest(payload);
        authStorage.set(nextAuth);
        setAuth(nextAuth);
        setUser(nextAuth.user);
      },
      async register(payload) {
        const nextAuth = await registerRequest(payload);
        authStorage.set(nextAuth);
        setAuth(nextAuth);
        setUser(nextAuth.user);
      },
      async logout() {
        if (auth?.refreshToken) {
          try {
            await logoutRequest(auth.refreshToken);
          } catch {
            // Ignore network logout failures and clear local state.
          }
        }
        authStorage.clear();
        setAuth(null);
        setUser(null);
      }
    }),
    [auth, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

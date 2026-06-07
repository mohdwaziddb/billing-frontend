import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCompanyTheme } from "../api/company";
import { getMyMenus } from "../api/permissions";
import { loginRequest, logoutRequest, meRequest, registerRequest } from "../api/auth";
import { applyThemeColor, DEFAULT_THEME_COLOR } from "../lib/theme";
import { authStorage } from "../lib/storage";
import type { AuthPayload, CompanyTheme, PermissionMatrix, UserProfile } from "../types/api";

type AuthContextValue = {
  auth: AuthPayload | null;
  user: UserProfile | null;
  permissions: PermissionMatrix | null;
  theme: CompanyTheme;
  refreshProfile: () => Promise<void>;
  refreshTheme: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  can: (menuCode: string, actionCode?: string) => boolean;
  firstAccessibleRoute: () => string | null;
  login: (payload: { username: string; password: string }) => Promise<string | null>;
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
  }) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<AuthPayload | null>(authStorage.get());
  const [user, setUser] = useState<UserProfile | null>(authStorage.get()?.user ?? null);
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null);
  const [theme, setTheme] = useState<CompanyTheme>({ themeColor: DEFAULT_THEME_COLOR });

  useEffect(() => {
    applyThemeColor(theme.themeColor);
  }, [theme.themeColor]);

  useEffect(() => {
    if (!auth?.accessToken) {
      setUser(null);
      setPermissions(null);
      setTheme({ themeColor: DEFAULT_THEME_COLOR });
      return;
    }
    Promise.all([meRequest(), getMyMenus(), getCompanyTheme().catch(() => ({ themeColor: DEFAULT_THEME_COLOR }))])
      .then(([profile, permissionData, themeData]) => {
        setUser(profile);
        setPermissions(permissionData);
        setTheme(themeData);
      })
      .catch(() => {
        authStorage.clear();
        setAuth(null);
        setUser(null);
        setPermissions(null);
        setTheme({ themeColor: DEFAULT_THEME_COLOR });
      });
  }, [auth?.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      user,
      permissions,
      theme,
      async refreshProfile() {
        if (!auth?.accessToken) {
          setUser(null);
          return;
        }
        const profile = await meRequest();
        setUser(profile);
        if (auth) {
          const nextAuth = { ...auth, user: profile };
          authStorage.set(nextAuth);
          setAuth(nextAuth);
        }
      },
      async refreshPermissions() {
        if (!auth?.accessToken) {
          setPermissions(null);
          return;
        }
        setPermissions(await getMyMenus());
      },
      async refreshTheme() {
        if (!auth?.accessToken) {
          setTheme({ themeColor: DEFAULT_THEME_COLOR });
          return;
        }
        setTheme(await getCompanyTheme());
      },
      can(menuCode, actionCode = "VIEW") {
        const menu = findMenu(permissions?.menus ?? [], menuCode);
        if (!menu?.canView) {
          return false;
        }
        if (actionCode === "VIEW") {
          return true;
        }
        return Boolean(menu.actions.find((action) => action.actionCode === actionCode)?.allowed);
      },
      firstAccessibleRoute() {
        return findFirstRoute(permissions?.menus ?? []);
      },
      async login(payload) {
        const nextAuth = await loginRequest(payload);
        authStorage.set(nextAuth);
        setAuth(nextAuth);
        setUser(nextAuth.user);
        const [nextPermissions, nextTheme] = await Promise.all([getMyMenus(), getCompanyTheme().catch(() => ({ themeColor: DEFAULT_THEME_COLOR }))]);
        setPermissions(nextPermissions);
        setTheme(nextTheme);
        return findFirstRoute(nextPermissions.menus);
      },
      async register(payload) {
        const nextAuth = await registerRequest(payload);
        authStorage.set(nextAuth);
        setAuth(nextAuth);
        setUser(nextAuth.user);
        const [nextPermissions, nextTheme] = await Promise.all([getMyMenus(), getCompanyTheme().catch(() => ({ themeColor: DEFAULT_THEME_COLOR }))]);
        setPermissions(nextPermissions);
        setTheme(nextTheme);
        return findFirstRoute(nextPermissions.menus);
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
        setPermissions(null);
        setTheme({ themeColor: DEFAULT_THEME_COLOR });
      }
    }),
    [auth, user, permissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const findMenu = (menus: PermissionMatrix["menus"], menuCode: string): PermissionMatrix["menus"][number] | undefined => {
  for (const menu of menus) {
    if (menu.menuCode === menuCode) {
      return menu;
    }
    const child = findMenu(menu.children ?? [], menuCode);
    if (child) {
      return child;
    }
  }
  return undefined;
};

const findFirstRoute = (menus: PermissionMatrix["menus"]): string | null => {
  const sorted = [...menus].sort((a, b) => a.displayOrder - b.displayOrder);
  for (const menu of sorted) {
    if (menu.children?.length) {
      const childRoute = findFirstRoute(menu.children);
      if (childRoute) {
        return childRoute;
      }
    }
    if (menu.canView && menu.menuRoute && menu.actions.some((action) => action.actionCode === "VIEW" && action.allowed)) {
      return menu.menuRoute;
    }
  }
  return null;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

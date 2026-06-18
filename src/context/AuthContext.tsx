import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCompanyTheme } from "../api/company";
import { getMyMenus } from "../api/permissions";
import { loginRequest, logoutRequest, meRequest, registerRequest } from "../api/auth";
import { defaultPlatformSettings, getPlatformSettings } from "../api/platform";
import { sessionCache } from "../lib/sessionCache";
import { getMyPreferences, updateMyPreferences } from "../api/userPreferences";
import { applyThemeColor, DEFAULT_THEME_COLOR } from "../lib/theme";
import { authStorage } from "../lib/storage";
import { ThemeBootstrapService } from "../services/ThemeBootstrapService";
import type { AuthPayload, CompanyTheme, PermissionMatrix, PlatformSettings, UserPreference, UserProfile } from "../types/api";

type AuthContextValue = {
  auth: AuthPayload | null;
  user: UserProfile | null;
  permissions: PermissionMatrix | null;
  theme: CompanyTheme;
  platform: PlatformSettings;
  preferences: UserPreference;
  refreshProfile: () => Promise<void>;
  refreshTheme: () => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
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
    adminUsername: string;
    adminMobileNumber: string;
    adminEmail: string;
    adminPassword: string;
  }) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_BOOTSTRAP_CACHE_KEY = "billing_frontend_auth_bootstrap";

type AuthBootstrapCache = {
  accessToken: string;
  user: UserProfile;
  permissions: PermissionMatrix;
  theme: CompanyTheme;
  platform: PlatformSettings;
  preferences: UserPreference;
};

let bootstrapPromise: Promise<AuthBootstrapCache> | null = null;
let bootstrapPromiseToken: string | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cachedThemeState = ThemeBootstrapService.getCachedState();
  const [auth, setAuth] = useState<AuthPayload | null>(authStorage.get());
  const [user, setUser] = useState<UserProfile | null>(authStorage.get()?.user ?? null);
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null);
  const [theme, setTheme] = useState<CompanyTheme>({ themeColor: cachedThemeState.themeColor });
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatformSettings);
  const [preferences, setPreferences] = useState<UserPreference>({ darkModeEnabled: cachedThemeState.darkModeEnabled });

  useEffect(() => {
    applyThemeColor(theme.themeColor);
  }, [theme.themeColor]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", preferences.darkModeEnabled);
  }, [preferences.darkModeEnabled]);

  useEffect(() => {
    if (!auth?.accessToken) {
      setUser(null);
      setPermissions(null);
      setPlatform(defaultPlatformSettings);
      sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
      return;
    }

    const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
    if (cached?.accessToken === auth.accessToken) {
      setUser(cached.user);
      setPermissions(cached.permissions);
      setTheme(cached.theme);
      setPlatform(cached.platform);
      setPreferences(cached.preferences);
      ThemeBootstrapService.save(cached.theme, cached.preferences);
      return;
    }

    if (!bootstrapPromise || bootstrapPromiseToken !== auth.accessToken) {
      bootstrapPromiseToken = auth.accessToken;
      bootstrapPromise = Promise.all([
        meRequest(),
        getMyMenus(),
        getCompanyTheme().catch(() => ({ themeColor: DEFAULT_THEME_COLOR })),
        getPlatformSettings().catch(() => defaultPlatformSettings),
        getMyPreferences().catch(() => ({ darkModeEnabled: false }))
      ]).then(([profile, permissionData, themeData, platformData, preferenceData]) => ({
        accessToken: auth.accessToken,
        user: profile,
        permissions: permissionData,
        theme: themeData,
        platform: platformData,
        preferences: preferenceData
      }));
    }

    bootstrapPromise
      .then((bootstrap) => {
        if (bootstrap.accessToken !== auth.accessToken) {
          return;
        }
        setUser(bootstrap.user);
        setPermissions(bootstrap.permissions);
        setTheme(bootstrap.theme);
        setPlatform(bootstrap.platform);
        setPreferences(bootstrap.preferences);
        sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, bootstrap);
        ThemeBootstrapService.save(bootstrap.theme, bootstrap.preferences);
      })
      .catch(() => {
        authStorage.clear();
        setAuth(null);
        setUser(null);
        setPermissions(null);
        sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
        ThemeBootstrapService.clear();
        setTheme({ themeColor: DEFAULT_THEME_COLOR });
        setPlatform(defaultPlatformSettings);
        setPreferences({ darkModeEnabled: false });
      })
      .finally(() => {
        bootstrapPromise = null;
        bootstrapPromiseToken = null;
      });
  }, [auth?.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      user,
      permissions,
      theme,
      platform,
      preferences,
      async refreshProfile() {
        if (!auth?.accessToken) {
          setUser(null);
          return;
        }
        const profile = await meRequest();
        setUser(profile);
        const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
        if (cached && cached.accessToken === auth.accessToken) {
          sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, user: profile });
        }
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
        const nextPermissions = await getMyMenus();
        setPermissions(nextPermissions);
        const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
        if (cached && cached.accessToken === auth.accessToken) {
          sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, permissions: nextPermissions });
        }
      },
      async refreshTheme() {
        if (!auth?.accessToken) {
          setTheme({ themeColor: DEFAULT_THEME_COLOR });
          ThemeBootstrapService.clear();
          return;
        }
        const nextTheme = await getCompanyTheme();
        setTheme(nextTheme);
        const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
        if (cached && cached.accessToken === auth.accessToken) {
          sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, theme: nextTheme });
        }
        ThemeBootstrapService.save(nextTheme, preferences);
      },
      async setDarkMode(enabled) {
        setPreferences({ darkModeEnabled: enabled });
        ThemeBootstrapService.saveDarkMode(enabled);
        if (auth?.accessToken) {
          const nextPreferences = await updateMyPreferences({ darkModeEnabled: enabled });
          setPreferences(nextPreferences);
          const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
          if (cached && cached.accessToken === auth.accessToken) {
            sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, preferences: nextPreferences });
          }
          ThemeBootstrapService.save(theme, nextPreferences);
        }
      },
      can(menuCode, actionCode = "VIEW") {
        const menu = findMenu(permissions?.menus ?? [], menuCode);
        if (!menu?.canView) {
          return false;
        }
        if (actionCode === "VIEW") {
          return true;
        }
        if (actionCode === "LOGS") {
          return Boolean(menu.actions.find((action) => (action.actionCode === "LOGS" || action.actionCode === "VIEW_LOGS") && action.allowed));
        }
        return Boolean(menu.actions.find((action) => action.actionCode === actionCode)?.allowed);
      },
      firstAccessibleRoute() {
        return findFirstRoute(permissions?.menus ?? []);
      },
      async login(payload) {
        const nextAuth = await loginRequest(payload);
        authStorage.set(nextAuth);
        const [nextPermissions, nextTheme, nextPlatform, nextPreferences] = await Promise.all([
          getMyMenus(),
          getCompanyTheme().catch(() => ({ themeColor: DEFAULT_THEME_COLOR })),
          getPlatformSettings().catch(() => defaultPlatformSettings),
          getMyPreferences().catch(() => ({ darkModeEnabled: false }))
        ]);
        setPermissions(nextPermissions);
        setTheme(nextTheme);
        setPlatform(nextPlatform);
        setPreferences(nextPreferences);
        sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, {
          accessToken: nextAuth.accessToken,
          user: nextAuth.user,
          permissions: nextPermissions,
          theme: nextTheme,
          platform: nextPlatform,
          preferences: nextPreferences
        });
        setAuth(nextAuth);
        setUser(nextAuth.user);
        ThemeBootstrapService.save(nextTheme, nextPreferences);
        return findFirstRoute(nextPermissions.menus);
      },
      async register(payload) {
        const nextAuth = await registerRequest(payload);
        authStorage.set(nextAuth);
        const [nextPermissions, nextTheme, nextPlatform, nextPreferences] = await Promise.all([
          getMyMenus(),
          getCompanyTheme().catch(() => ({ themeColor: DEFAULT_THEME_COLOR })),
          getPlatformSettings().catch(() => defaultPlatformSettings),
          getMyPreferences().catch(() => ({ darkModeEnabled: false }))
        ]);
        setPermissions(nextPermissions);
        setTheme(nextTheme);
        setPlatform(nextPlatform);
        setPreferences(nextPreferences);
        sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, {
          accessToken: nextAuth.accessToken,
          user: nextAuth.user,
          permissions: nextPermissions,
          theme: nextTheme,
          platform: nextPlatform,
          preferences: nextPreferences
        });
        setAuth(nextAuth);
        setUser(nextAuth.user);
        ThemeBootstrapService.save(nextTheme, nextPreferences);
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
        sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
        ThemeBootstrapService.clear();
        setAuth(null);
        setUser(null);
        setPermissions(null);
        setTheme({ themeColor: DEFAULT_THEME_COLOR });
        setPlatform(defaultPlatformSettings);
        setPreferences({ darkModeEnabled: false });
      }
    }),
    [auth, user, permissions, theme, platform, preferences]
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

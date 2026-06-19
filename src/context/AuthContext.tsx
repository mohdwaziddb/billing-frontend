import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getCompanyTheme } from "../api/company";
import { getMyMenus } from "../api/permissions";
import { getPlatformSettings, defaultPlatformSettings } from "../api/platform";
import { getMyPreferences, updateMyPreferences } from "../api/userPreferences";
import { loginRequest, logoutRequest, meRequest, platformAdminLoginRequest, registerRequest } from "../api/auth";
import { authStorage } from "../lib/storage";
import { sessionCache } from "../lib/sessionCache";
import { applyThemeColor, DEFAULT_THEME_COLOR } from "../lib/theme";
import { ThemeBootstrapService } from "../services/ThemeBootstrapService";
import type {
  AuthPayload,
  CompanyTheme,
  PermissionMatrix,
  PlatformAdminAuthPayload,
  PlatformSettings,
  StoredAuthSession,
  UserPreference,
  UserProfile
} from "../types/api";

type AuthContextValue = {
  auth: AuthPayload | PlatformAdminAuthPayload | null;
  sessionType: "user" | "platform-admin" | null;
  isPlatformAdmin: boolean;
  platformAdmin: PlatformAdminAuthPayload | null;
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
  loginPlatformAdmin: (payload: { username: string; password: string }) => Promise<string>;
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
const PUBLIC_THEME_ROUTES = new Set(["/", "/login", "/register", "/platform-admin/login"]);

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

const clearLocalState = (
  setSession: (value: StoredAuthSession | null) => void,
  setUser: (value: UserProfile | null) => void,
  setPermissions: (value: PermissionMatrix | null) => void,
  setTheme: (value: CompanyTheme) => void,
  setPlatform: (value: PlatformSettings) => void,
  setPreferences: (value: UserPreference) => void
) => {
  authStorage.clear();
  sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
  ThemeBootstrapService.clear();
  setSession(null);
  setUser(null);
  setPermissions(null);
  setTheme({ themeColor: DEFAULT_THEME_COLOR });
  setPlatform(defaultPlatformSettings);
  setPreferences({ darkModeEnabled: false });
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const cachedThemeState = ThemeBootstrapService.getCachedState();
  const [session, setSession] = useState<StoredAuthSession | null>(authStorage.get());
  const [user, setUser] = useState<UserProfile | null>(session?.type === "user" ? session.auth.user : null);
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null);
  const [theme, setTheme] = useState<CompanyTheme>({ themeColor: cachedThemeState.themeColor });
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatformSettings);
  const [preferences, setPreferences] = useState<UserPreference>({ darkModeEnabled: cachedThemeState.darkModeEnabled });

  const auth = session?.auth ?? null;
  const sessionType = session?.type ?? null;
  const isPlatformAdmin = session?.type === "platform-admin";
  const platformAdmin = isPlatformAdmin ? session.auth : null;
  const usePublicTheme = PUBLIC_THEME_ROUTES.has(location.pathname);

  useEffect(() => {
    applyThemeColor(usePublicTheme ? DEFAULT_THEME_COLOR : theme.themeColor);
  }, [theme.themeColor, usePublicTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", !usePublicTheme && preferences.darkModeEnabled);
  }, [preferences.darkModeEnabled, usePublicTheme]);

  useEffect(() => {
    if (!session?.auth.accessToken) {
      setUser(null);
      setPermissions(null);
      setPlatform(defaultPlatformSettings);
      sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
      return;
    }

    if (session.type === "platform-admin") {
      setUser(null);
      setPermissions(null);
      sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
      ThemeBootstrapService.clear();
      setTheme({ themeColor: DEFAULT_THEME_COLOR });
      setPreferences({ darkModeEnabled: false });
      getPlatformSettings()
        .then(setPlatform)
        .catch(() => setPlatform(defaultPlatformSettings));
      return;
    }

    const accessToken = session.auth.accessToken;
    const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
    if (cached?.accessToken === accessToken) {
      setUser(cached.user);
      setPermissions(cached.permissions);
      setTheme(cached.theme);
      setPlatform(cached.platform);
      setPreferences(cached.preferences);
      ThemeBootstrapService.remember(cached.theme, cached.preferences);
      return;
    }

    if (!bootstrapPromise || bootstrapPromiseToken !== accessToken) {
      bootstrapPromiseToken = accessToken;
      bootstrapPromise = Promise.all([
        meRequest(),
        getMyMenus(),
        getCompanyTheme().catch(() => ({ themeColor: DEFAULT_THEME_COLOR })),
        getPlatformSettings().catch(() => defaultPlatformSettings),
        getMyPreferences().catch(() => ({ darkModeEnabled: false }))
      ]).then(([profile, permissionData, themeData, platformData, preferenceData]) => ({
        accessToken,
        user: profile,
        permissions: permissionData,
        theme: themeData,
        platform: platformData,
        preferences: preferenceData
      }));
    }

    bootstrapPromise
      .then((bootstrap) => {
        if (bootstrap.accessToken !== accessToken) {
          return;
        }
        setUser(bootstrap.user);
        setPermissions(bootstrap.permissions);
        setTheme(bootstrap.theme);
        setPlatform(bootstrap.platform);
        setPreferences(bootstrap.preferences);
        sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, bootstrap);
        ThemeBootstrapService.remember(bootstrap.theme, bootstrap.preferences);
      })
      .catch(() => {
        clearLocalState(setSession, setUser, setPermissions, setTheme, setPlatform, setPreferences);
      })
      .finally(() => {
        bootstrapPromise = null;
        bootstrapPromiseToken = null;
      });
  }, [session?.auth.accessToken, session?.type]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      sessionType,
      isPlatformAdmin,
      platformAdmin,
      user,
      permissions,
      theme,
      platform,
      preferences,
      async refreshProfile() {
        if (!session?.auth.accessToken || session.type !== "user") {
          setUser(null);
          return;
        }
        const profile = await meRequest();
        setUser(profile);
        const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
        if (cached && cached.accessToken === session.auth.accessToken) {
          sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, user: profile });
        }
        const nextSession: StoredAuthSession = {
          type: "user",
          auth: { ...session.auth, user: profile }
        };
        authStorage.set(nextSession);
        setSession(nextSession);
      },
      async refreshPermissions() {
        if (!session?.auth.accessToken || session.type !== "user") {
          setPermissions(null);
          return;
        }
        const nextPermissions = await getMyMenus();
        setPermissions(nextPermissions);
        const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
        if (cached && cached.accessToken === session.auth.accessToken) {
          sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, permissions: nextPermissions });
        }
      },
      async refreshTheme() {
        if (!session?.auth.accessToken) {
          setTheme({ themeColor: DEFAULT_THEME_COLOR });
          ThemeBootstrapService.clear();
          return;
        }
        if (session.type === "platform-admin") {
          setTheme({ themeColor: DEFAULT_THEME_COLOR });
          setPlatform(await getPlatformSettings().catch(() => defaultPlatformSettings));
          return;
        }
        const nextTheme = await getCompanyTheme();
        setTheme(nextTheme);
        const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
        if (cached && cached.accessToken === session.auth.accessToken) {
          sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, theme: nextTheme });
        }
        ThemeBootstrapService.remember(nextTheme, preferences);
      },
      async setDarkMode(enabled) {
        if (session?.type === "platform-admin") {
          setPreferences({ darkModeEnabled: enabled });
          return;
        }
        setPreferences({ darkModeEnabled: enabled });
        ThemeBootstrapService.remember(theme, { darkModeEnabled: enabled });
        if (session?.auth.accessToken && session.type === "user") {
          const nextPreferences = await updateMyPreferences({ darkModeEnabled: enabled });
          setPreferences(nextPreferences);
          const cached = sessionCache.get<AuthBootstrapCache>(AUTH_BOOTSTRAP_CACHE_KEY);
          if (cached && cached.accessToken === session.auth.accessToken) {
            sessionCache.set(AUTH_BOOTSTRAP_CACHE_KEY, { ...cached, preferences: nextPreferences });
          }
          ThemeBootstrapService.remember(theme, nextPreferences);
        }
      },
      can(menuCode, actionCode = "VIEW") {
        if (session?.type === "platform-admin") {
          return false;
        }
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
        if (session?.type === "platform-admin") {
          return "/platform-admin/dashboard";
        }
        return findFirstRoute(permissions?.menus ?? []);
      },
      async login(payload) {
        const nextAuth = await loginRequest(payload);
        const nextSession: StoredAuthSession = { type: "user", auth: nextAuth };
        authStorage.set(nextSession);
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
        setSession(nextSession);
        setUser(nextAuth.user);
        ThemeBootstrapService.remember(nextTheme, nextPreferences);
        return findFirstRoute(nextPermissions.menus);
      },
      async loginPlatformAdmin(payload) {
        const nextAuth = await platformAdminLoginRequest(payload);
        const nextSession: StoredAuthSession = { type: "platform-admin", auth: nextAuth };
        authStorage.set(nextSession);
        setSession(nextSession);
        setUser(null);
        setPermissions(null);
        setTheme({ themeColor: DEFAULT_THEME_COLOR });
        setPreferences({ darkModeEnabled: false });
        setPlatform(await getPlatformSettings().catch(() => defaultPlatformSettings));
        sessionCache.clear(AUTH_BOOTSTRAP_CACHE_KEY);
        ThemeBootstrapService.clear();
        return "/platform-admin/dashboard";
      },
      async register(payload) {
        const nextAuth = await registerRequest(payload);
        const nextSession: StoredAuthSession = { type: "user", auth: nextAuth };
        authStorage.set(nextSession);
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
        setSession(nextSession);
        setUser(nextAuth.user);
        ThemeBootstrapService.remember(nextTheme, nextPreferences);
        return findFirstRoute(nextPermissions.menus);
      },
      async logout() {
        if (session?.type === "user" && session.auth.refreshToken) {
          try {
            await logoutRequest(session.auth.refreshToken);
          } catch {
            // Ignore logout failures and clear local session anyway.
          }
        }
        clearLocalState(setSession, setUser, setPermissions, setTheme, setPlatform, setPreferences);
      }
    }),
    [auth, sessionType, isPlatformAdmin, platformAdmin, user, permissions, theme, platform, preferences, session]
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

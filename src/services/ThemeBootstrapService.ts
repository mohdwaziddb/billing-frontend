import { applyThemeColor, DEFAULT_THEME_COLOR, normalizeHexColor } from "../lib/theme";
import type { CompanyTheme, UserPreference } from "../types/api";

const THEME_BOOTSTRAP_KEY = "billing_frontend_theme_bootstrap";

export type ThemeBootstrapState = {
  themeColor: string;
  darkModeEnabled: boolean;
};

const defaultState: ThemeBootstrapState = {
  themeColor: DEFAULT_THEME_COLOR,
  darkModeEnabled: false
};

const read = (): ThemeBootstrapState => {
  try {
    const raw = localStorage.getItem(THEME_BOOTSTRAP_KEY);
    if (!raw) {
      return defaultState;
    }
    const parsed = JSON.parse(raw) as Partial<ThemeBootstrapState>;
    return {
      themeColor: normalizeHexColor(parsed.themeColor ?? DEFAULT_THEME_COLOR),
      darkModeEnabled: Boolean(parsed.darkModeEnabled)
    };
  } catch {
    return defaultState;
  }
};

const write = (state: ThemeBootstrapState) => {
  try {
    localStorage.setItem(THEME_BOOTSTRAP_KEY, JSON.stringify({
      themeColor: normalizeHexColor(state.themeColor),
      darkModeEnabled: state.darkModeEnabled
    }));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
};

export const ThemeBootstrapService = {
  key: THEME_BOOTSTRAP_KEY,
  getCachedState: read,
  applyCachedTheme() {
    const state = read();
    applyThemeColor(state.themeColor);
    document.documentElement.classList.toggle("dark", state.darkModeEnabled);
    return state;
  },
  save(theme: CompanyTheme, preferences: UserPreference) {
    const state = {
      themeColor: normalizeHexColor(theme.themeColor ?? DEFAULT_THEME_COLOR),
      darkModeEnabled: Boolean(preferences.darkModeEnabled)
    };
    write(state);
    applyThemeColor(state.themeColor);
    document.documentElement.classList.toggle("dark", state.darkModeEnabled);
    return state;
  },
  saveTheme(theme: CompanyTheme) {
    const current = read();
    return this.save(theme, { darkModeEnabled: current.darkModeEnabled });
  },
  saveDarkMode(enabled: boolean) {
    const current = read();
    return this.save({ themeColor: current.themeColor }, { darkModeEnabled: enabled });
  },
  clear() {
    try {
      localStorage.removeItem(THEME_BOOTSTRAP_KEY);
    } catch {
      // Ignore storage failures.
    }
    applyThemeColor(DEFAULT_THEME_COLOR);
    document.documentElement.classList.remove("dark");
  }
};

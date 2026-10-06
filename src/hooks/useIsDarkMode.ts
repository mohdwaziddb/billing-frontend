import { useEffect, useState } from "react";

/**
 * Single source of truth for "is dark theme actually rendered right now".
 * Reads the `dark` class on <html> (applied by ThemeBootstrapService) and
 * updates live when the user toggles dark mode. Server-side user-preferences
 * may disagree with what's rendered (logged-out, cached theme), so charts
 * must use this hook instead of preferences.
 */
export const useIsDarkMode = (): boolean => {
  const read = () =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const [isDark, setIsDark] = useState<boolean>(read);

  useEffect(() => {
    setIsDark(read());
    const observer = new MutationObserver(() => setIsDark(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

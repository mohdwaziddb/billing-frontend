import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Tags,
  Users,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { env } from "../config/env";
import { useAuth } from "../context/AuthContext";
import { MenuSearchService, type MenuSearchResult } from "../services/MenuSearchService";

const iconMap: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Palette,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  Wallet
};

export const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { user, can, logout, permissions, platform, preferences, setDarkMode } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLLabelElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchResults = useMemo(
    () => MenuSearchService.search(searchValue, permissions?.menus ?? []),
    [permissions?.menus, searchValue]
  );
  const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");
  const platformLogoUrl = platform.platformLogo
    ? (platform.platformLogo.startsWith("http") ? platform.platformLogo : `${apiOrigin}${platform.platformLogo}`)
    : null;

  const navigateToResult = (result: MenuSearchResult) => {
    setSearchValue("");
    setSearchOpen(false);
    setActiveSearchIndex(0);
    navigate(result.route);
  };

  useEffect(() => {
    if (!profileOpen && !searchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!profileRef.current?.contains(target)) {
        setProfileOpen(false);
      }
      if (!searchRef.current?.contains(target)) {
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen, searchOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchValue]);

  return (
    <header className="sticky top-3 z-40 rounded-[22px] border border-slate-200 bg-white/92 px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl md:px-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,0.75fr)_minmax(280px,0.9fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {platformLogoUrl ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
              <img src={platformLogoUrl} alt={platform.platformName} className="h-full w-full object-contain p-1.5" />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{title}</p>
            <h1 className="page-title truncate text-xl tracking-tight text-slate-950 md:text-2xl">{platform.platformName}</h1>
            <p className="mt-0.5 truncate text-sm text-slate-500">{platform.platformTagline || subtitle}</p>
          </div>
        </div>
        <label ref={searchRef} className="relative hidden min-w-0 lg:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            ref={searchInputRef}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-20 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:bg-white focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_12%,transparent)]"
            placeholder="Search menu..."
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value);
              setSearchOpen(event.target.value.trim().length >= 3);
            }}
            onFocus={() => setSearchOpen(searchValue.trim().length >= 3)}
            onKeyDown={(event) => {
              if (!searchOpen || !searchResults.length) {
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveSearchIndex((current) => Math.min(searchResults.length - 1, current + 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveSearchIndex((current) => Math.max(0, current - 1));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                navigateToResult(searchResults[activeSearchIndex]);
              }
            }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-400">Ctrl + K</span>
          {searchOpen ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
              {searchResults.length ? (
                <div className="space-y-1">
                  {searchResults.map((result, index) => {
                    const Icon = result.icon ? iconMap[result.icon] ?? LayoutDashboard : LayoutDashboard;
                    const active = index === activeSearchIndex;
                    return (
                      <button
                        key={`${result.id}-${result.route}`}
                        type="button"
                        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${active ? "bg-[color-mix(in_srgb,var(--theme-color)_9%,white)] text-[var(--theme-dark)]" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"}`}
                        onMouseEnter={() => setActiveSearchIndex(index)}
                        onClick={() => navigateToResult(result)}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[var(--theme-color)]">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 truncate">{result.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-sm font-medium text-slate-500">No matching menu found.</div>
              )}
            </div>
          ) : null}
        </label>
        <div className="flex items-center justify-between gap-2 xl:justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:text-[var(--theme-color)]"
              aria-label={preferences.darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"}
              title={preferences.darkModeEnabled ? "Light Mode" : "Dark Mode"}
              onClick={() => void setDarkMode(!preferences.darkModeEnabled)}
            >
              {preferences.darkModeEnabled ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {can("THEME_SETTINGS", "VIEW") ? (
              <Link to="/setup/theme-settings" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:text-[var(--theme-color)]" aria-label="Theme settings">
                <Palette size={18} />
              </Link>
            ) : null}
            <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:text-[var(--theme-color)]" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">5</span>
            </button>
          </div>
          <div ref={profileRef} className="relative">
            <button
              type="button"
              className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-2.5 py-2 transition hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((current) => !current)}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--theme-color)] text-sm font-bold text-[var(--theme-contrast)]">
                {(user?.fullName ?? "O").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-sm font-bold text-slate-950">{user?.fullName ?? "Owner"}</p>
                <p className="truncate text-xs text-slate-500">{user?.role ?? "OWNER"}</p>
              </div>
              <ChevronDown className={`hidden text-slate-400 transition sm:block ${profileOpen ? "rotate-180" : ""}`} size={16} />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)]" role="menu">
                <div className="border-b border-slate-100 px-3 py-3">
                  <p className="truncate text-sm font-bold text-slate-950">{user?.fullName ?? "Owner"}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{user?.email ?? user?.role ?? "User"}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  onClick={() => {
                    setProfileOpen(false);
                    void logout();
                  }}
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

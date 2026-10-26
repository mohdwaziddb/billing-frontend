import {
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  Sun,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMfaStatus } from "../api/mfa";
import { resolveAssetUrl } from "../config/env";
import { resolveMenuIcon } from "../config/menuIcons";
import { useAuth } from "../context/AuthContext";
import { TOGGLE_SIDEBAR_EVENT } from "../layouts/DashboardLayout";
import { MenuSearchService, type MenuSearchResult } from "../services/MenuSearchService";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { Modal } from "./Modal";
import { MyProfileModal } from "./MyProfileModal";
import { UserAvatar } from "./UserAvatar";

const headerIconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition hover:text-[var(--theme-color)]";

const profileMenuItemClass =
  "mt-1 flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition";

// Har page apna Header render karta hai (navigation par remount), isliye component
// ref me rakha check har page par /mfa/status dobara maarta tha. Module-level: ek token = ek call.
let mfaMenuVisibilityCache: { token: string; visible: Promise<boolean> } | null = null;

export const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { auth, user, can, logout, permissions, platform, preferences, setDarkMode, sessionType, platformAdmin } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [myProfileOpen, setMyProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Company MFA flag session user object se nahi, live API se: purane
  // sessions (backend deploy se pehle ke login) me applyMfa field hoti hi
  // nahi, aur cached session se button hamesha chhupa rehta. Ek baar per
  // session fetch — fail ho to chup-chaap chhupao, kabhi block mat karo.
  const [mfaMenuVisible, setMfaMenuVisible] = useState(false);
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
  const platformLogoUrl = resolveAssetUrl(platform.platformLogo);
  const headerTitle = title;
  const profileName = sessionType === "platform-admin" ? "Platform Admin" : (user?.fullName ?? "Owner");
  // Tenant super-admin sessions carry role OWNER for full rights — show the
  // explicit SUPER ADMIN label so nobody confuses it with a normal owner login.
  const profileRole = sessionType === "platform-admin" ? "Platform Administrator" : (user?.superAdmin ? "Super Admin" : (user?.role ?? "OWNER"));
  const profileEmail = sessionType === "platform-admin" ? (platformAdmin?.username ?? "Platform Admin") : (user?.email ?? user?.role ?? "User");
  const profileInitial = sessionType === "platform-admin" ? "P" : (user?.fullName ?? "O").slice(0, 1).toUpperCase();

  useEffect(() => {
    document.title = `${title} | ${platform.platformName || user?.company?.name || "Billing"}`;
  }, [platform.platformName, title, user?.company?.name]);

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

  useEffect(() => {
    const token = auth?.accessToken;
    if (sessionType !== "user" || !token) {
      return;
    }
    if (!mfaMenuVisibilityCache || mfaMenuVisibilityCache.token !== token) {
      mfaMenuVisibilityCache = {
        token,
        visible: getMfaStatus()
          .then((status) => Boolean(status.applyMfaByCompany))
          .catch(() => false)
      };
    }
    let cancelled = false;
    void mfaMenuVisibilityCache.visible.then((visible) => {
      if (!cancelled) {
        setMfaMenuVisible(visible);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, sessionType]);

  return (
    <header className="sticky top-0 z-30 -mx-3 -mt-3 flex min-h-[60px] flex-col justify-center border-b border-slate-200 bg-white px-4 py-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] md:-mx-5 md:-mt-5 md:px-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,0.75fr)_minmax(280px,0.9fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className={`${headerIconButtonClass} lg:hidden`}
            aria-label="Toggle menu"
            onClick={() => window.dispatchEvent(new Event(TOGGLE_SIDEBAR_EVENT))}
          >
            <Menu size={19} />
          </button>
          {platformLogoUrl ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
              <img src={platformLogoUrl} alt={headerTitle} className="h-full w-full object-contain p-1.5" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="page-title fs-20 truncate font-semibold tracking-tight text-slate-950">{headerTitle}</h1>
            <p className="fs-12 mt-0.5 line-clamp-2 text-slate-500" title={subtitle}>{subtitle}</p>
          </div>
        </div>
        <label ref={searchRef} className="relative hidden min-w-0 lg:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            ref={searchInputRef}
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-11 pr-20 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:bg-white focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_12%,transparent)]"
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
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
              {searchResults.length ? (
                <div className="space-y-1">
                  {searchResults.map((result, index) => {
                    const Icon = resolveMenuIcon(result.icon);
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
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{result.label}</span>
                          {result.parentPath ? (
                            <span className="fs-11 mt-0.5 block truncate font-medium text-slate-400">{result.parentPath}</span>
                          ) : null}
                        </span>
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
              className={headerIconButtonClass}
              aria-label={preferences.darkModeEnabled ? "Switch to light mode" : "Switch to dark mode"}
              title={preferences.darkModeEnabled ? "Light Mode" : "Dark Mode"}
              onClick={() => void setDarkMode(!preferences.darkModeEnabled)}
            >
              {preferences.darkModeEnabled ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {can("THEME_SETTINGS", "VIEW") ? (
              <Link to="/setup/theme-settings" className={headerIconButtonClass} aria-label="Theme settings">
                <Palette size={18} />
              </Link>
            ) : null}
          </div>
          <div ref={profileRef} className="relative">
            <button
              type="button"
              className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 px-2.5 py-1.5 transition hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((current) => !current)}
            >
              {sessionType === "user" ? (
                <UserAvatar name={user?.fullName} photoUrl={user?.photoUrl} />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-color)] bg-[image:var(--theme-gradient)] text-sm font-bold text-[var(--theme-contrast)]">
                  {profileInitial}
                </div>
              )}
              <div className="hidden min-w-0 text-left sm:block">
                <p className="fs-13 truncate font-bold text-slate-950">{profileName}</p>
                <p className="fs-11 truncate text-slate-500">{profileRole}</p>
              </div>
              <ChevronDown className={`hidden text-slate-400 transition sm:block ${profileOpen ? "rotate-180" : ""}`} size={16} />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)]" role="menu">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="fs-13 truncate font-bold text-slate-950">{profileName}</p>
                  <p className="fs-11 mt-0.5 truncate text-slate-500">{profileEmail}</p>
                </div>
                {sessionType === "user" ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${profileMenuItemClass} text-slate-700 hover:bg-slate-50 hover:text-slate-950`}
                    onClick={() => {
                      setProfileOpen(false);
                      setMyProfileOpen(true);
                    }}
                  >
                    <UserRound size={17} />
                    My Profile
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className={`${profileMenuItemClass} text-slate-700 hover:bg-slate-50 hover:text-slate-950`}
                  onClick={() => {
                    setProfileOpen(false);
                    setForgotPasswordOpen(true);
                  }}
                >
                  <KeyRound size={17} />
                  Forgot Password
                </button>
                {sessionType === "user" && mfaMenuVisible ? (
                  <button
                    type="button"
                    role="menuitem"
                    className={`${profileMenuItemClass} text-slate-700 hover:bg-slate-50 hover:text-slate-950`}
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/setup/two-step-verification");
                    }}
                  >
                    <ShieldCheck size={17} />
                    Two Step Authentication
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className={`${profileMenuItemClass} text-rose-600 hover:bg-rose-50`}
                  onClick={() => {
                    setProfileOpen(false);
                    setLogoutConfirmOpen(true);
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
      {sessionType === "user" ? <MyProfileModal open={myProfileOpen} onClose={() => setMyProfileOpen(false)} /> : null}
      <ForgotPasswordModal
        open={forgotPasswordOpen}
        initialUsername={user?.email ?? user?.mobileNumber ?? ""}
        identifierLocked={sessionType === "user" && Boolean(user?.email)}
        onClose={() => setForgotPasswordOpen(false)}
        onPasswordReset={() => {
          void logout();
        }}
      />
      <Modal
        open={logoutConfirmOpen}
        title="Sign out?"
        eyebrow="Logout"
        maxWidthClass="max-w-md"
        onClose={() => setLogoutConfirmOpen(false)}
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Are you sure you want to sign out{profileName ? `, ${profileName}` : ""}? You will need to sign in again to
          continue.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(false)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setLogoutConfirmOpen(false);
              void logout();
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-transparent bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </Modal>
    </header>
  );
};

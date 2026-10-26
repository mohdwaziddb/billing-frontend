import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { AiAssistantWidget } from "../components/AiAssistantWidget";
import { Sidebar } from "../components/Sidebar";

const COLLAPSED_KEY = "billing_sidebar_collapsed";
export const TOGGLE_SIDEBAR_EVENT = "billing:toggle-sidebar";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
};

// Lazy page chunk aane tak halka placeholder (sidebar/header layout wahi rehta hai).
export const RouteChunkFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading page">
    <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[var(--theme-color)]" />
  </div>
);

export const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.sidebarCollapsed = String(collapsed);
    return () => {
      delete root.dataset.sidebarCollapsed;
    };
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [collapsed]);

  useEffect(() => {
    const handleToggle = () => {
      if (window.innerWidth < 1024) {
        setMobileOpen((current) => !current);
      } else {
        setCollapsed((current) => !current);
      }
    };
    window.addEventListener(TOGGLE_SIDEBAR_EVENT, handleToggle);
    return () => window.removeEventListener(TOGGLE_SIDEBAR_EVENT, handleToggle);
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={[
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "lg:pl-[70px]" : "lg:pl-[240px]"
        ].join(" ")}
      >
        <main className="min-w-0 px-3 py-3 md:px-5 md:py-5">
          <div className="mx-auto max-w-[1680px] space-y-4 md:space-y-5">
            <Suspense fallback={<RouteChunkFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <AiAssistantWidget />
    </div>
  );
};

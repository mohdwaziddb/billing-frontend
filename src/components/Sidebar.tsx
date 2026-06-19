import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Mail,
  ReceiptIndianRupee,
  ReceiptText,
  Settings,
  ShieldCheck,
  Palette,
  Users,
  Tags,
  TrendingUp,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { env } from "../config/env";
import { useAuth } from "../context/AuthContext";
import type { MenuPermission } from "../types/api";

const iconMap: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Mail,
  Palette,
  ReceiptIndianRupee,
  Settings,
  ShieldCheck,
  Tags,
  TrendingUp,
  Users,
  Wallet
};

export const Sidebar = () => {
  const { user, permissions, platform, sessionType, isPlatformAdmin } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
  const menus = useMemo(() => {
    if (isPlatformAdmin) {
      return [
        {
          id: -1,
          menuName: "Platform Administration",
          menuIcon: "ShieldCheck",
          menuRoute: "",
          displayOrder: 1,
          canView: true,
          actions: [],
          children: [
            { id: -2, menuName: "Dashboard", menuIcon: "LayoutDashboard", menuRoute: "/platform-admin/dashboard", displayOrder: 1, canView: true, actions: [], children: [] },
            { id: -3, menuName: "Companies", menuIcon: "Building2", menuRoute: "/platform-admin/companies", displayOrder: 2, canView: true, actions: [], children: [] },
            { id: -4, menuName: "Settings", menuIcon: "Settings", menuRoute: "/platform-admin/settings", displayOrder: 3, canView: true, actions: [], children: [] }
          ]
        }
      ];
    }
    return filterCompanyMenus(permissions?.menus ?? []);
  }, [isPlatformAdmin, permissions?.menus]);

  useEffect(() => {
    const activeParent = menus.find((menu) => (menu.children ?? []).some((child) => child.menuRoute === location.pathname));
    if (!activeParent) {
      return;
    }
    setOpenMenus((current) => (current[activeParent.id] ? current : { ...current, [activeParent.id]: true }));
  }, [location.pathname, menus]);

  const company = user?.company;
  const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");
  const companyLogoUrl = company?.logoUrl ? (company.logoUrl.startsWith("http") ? company.logoUrl : `${apiOrigin}${company.logoUrl}`) : null;
  const title = sessionType === "platform-admin" ? (platform.platformName || "Platform Admin") : (company?.name ?? "Workspace");
  const subtitle = sessionType === "platform-admin" ? "Platform Administrator" : (user?.role ?? "User");

  return (
    <aside className={`flex w-full flex-col rounded-[24px] bg-[linear-gradient(180deg,var(--theme-dark),color-mix(in_srgb,var(--theme-dark)_76%,#020617))] p-4 text-white shadow-[0_22px_55px_rgba(7,19,48,0.18)] transition-all duration-300 lg:h-full lg:max-h-[calc(100vh-2.5rem)] ${collapsed ? "lg:w-[92px] lg:px-3" : "lg:w-[292px]"}`}>
      <div className={`relative mb-5 flex shrink-0 ${collapsed ? "justify-center" : "justify-center"}`}>
        <div className={`min-w-0 ${collapsed ? "lg:w-full" : "w-full"}`}>
          <div className={`flex flex-col items-center ${collapsed ? "" : "gap-2"}`}>
            <button
              type="button"
              className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_12px_28px_rgba(2,6,23,0.16)] transition duration-200 ${collapsed ? "cursor-pointer hover:scale-105 hover:shadow-[0_14px_34px_rgba(255,255,255,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" : "cursor-default"}`}
              aria-label={collapsed ? "Expand sidebar" : `${company?.name ?? "Company"} logo`}
              title={collapsed ? "Expand sidebar" : title}
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                }
              }}
            >
              {sessionType !== "platform-admin" && companyLogoUrl ? <img src={companyLogoUrl} alt={`${company?.name ?? "Company"} logo`} className="h-full w-full object-contain p-1.5" /> : <ReceiptText className="text-[var(--theme-color)]" size={28} />}
            </button>
            {!collapsed ? (
              <div className="min-w-0 text-center">
                <h2 className="truncate text-xl font-extrabold tracking-tight text-white">{title}</h2>
                <p className="mt-0.5 truncate text-sm text-white/68">{subtitle}</p>
              </div>
            ) : null}
          </div>
        </div>
        {!collapsed ? (
          <button
            type="button"
            className="absolute right-1 top-0 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/18 hover:text-white lg:inline-flex"
            aria-label="Collapse sidebar"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft size={17} />
          </button>
        ) : null}
      </div>

      <nav className="scrollbar-thin -mr-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden pr-2">
        {menus.map((item) => {
          const Icon = item.menuIcon ? iconMap[item.menuIcon] ?? LayoutDashboard : LayoutDashboard;
          const children = (item.children ?? []).filter((child) => child.canView).sort((a, b) => a.displayOrder - b.displayOrder);
          if (children.length) {
            if (collapsed) {
              return (
                <div key={item.id} className="space-y-1">
                  {children.map((child) => {
                    const ChildIcon = child.menuIcon ? iconMap[child.menuIcon] ?? LayoutDashboard : LayoutDashboard;
                    return (
                      <NavLink
                        key={child.id}
                        to={child.menuRoute}
                        title={child.menuName}
                        className={({ isActive }) =>
                          [
                            "flex min-h-11 items-center justify-center rounded-2xl border px-0 py-2.5 text-sm font-semibold transition",
                            isActive
                              ? "border-white/18 bg-[var(--theme-color)] text-[var(--theme-contrast)] shadow-[0_12px_24px_rgba(2,6,23,0.18)]"
                              : "border-transparent text-white/78 hover:bg-white/10 hover:text-white"
                          ].join(" ")
                        }
                      >
                        <ChildIcon className="shrink-0" size={18} />
                      </NavLink>
                    );
                  })}
                </div>
              );
            }
            const isOpen = Boolean(openMenus[item.id]);
            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  title={collapsed ? item.menuName : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                  onClick={() => setOpenMenus((current) => ({ ...current, [item.id]: !current[item.id] }))}
                  aria-expanded={isOpen}
                >
                  <Icon className="shrink-0" size={18} />
                  {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.menuName}</span> : null}
                  {!collapsed ? <ChevronDown className={isOpen ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} size={16} /> : null}
                </button>
                {isOpen && !collapsed ? (
                  <div className="ml-5 flex flex-col gap-1 border-l border-white/10 pl-3 pr-1">
                    {children.map((child) => {
                      const ChildIcon = child.menuIcon ? iconMap[child.menuIcon] ?? LayoutDashboard : LayoutDashboard;
                      return (
                        <NavLink
                          key={child.id}
                          to={child.menuRoute}
                          className={({ isActive }) =>
                            [
                              "min-h-10 rounded-2xl px-4 py-2.5 text-sm font-semibold transition flex items-center gap-3",
                              isActive
                                ? "border border-white/18 bg-[var(--theme-color)] text-[var(--theme-contrast)] shadow-[0_12px_24px_rgba(2,6,23,0.18)]"
                                : "border border-transparent text-white/72 hover:bg-white/10 hover:text-white"
                            ].join(" ")
                          }
                        >
                          <ChildIcon className="shrink-0" size={16} />
                          <span className="min-w-0 truncate">{child.menuName}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }
          return (
          <NavLink
            key={item.id}
            to={item.menuRoute}
            title={collapsed ? item.menuName : undefined}
            end={item.menuRoute === "/dashboard" || item.menuRoute === "/create-invoice" || item.menuRoute === "/payments" || item.menuRoute === "/outstanding" || item.menuRoute === "/analytics"}
            className={({ isActive }) =>
              [
                `min-h-11 rounded-2xl px-3 py-2.5 text-sm font-semibold transition flex items-center gap-3 ${collapsed ? "lg:justify-center lg:px-0" : ""}`,
                isActive
                  ? "border border-white/18 bg-[var(--theme-color)] text-[var(--theme-contrast)] shadow-[0_12px_24px_rgba(2,6,23,0.18)]"
                  : "border border-transparent text-white/78 hover:bg-white/10 hover:text-white"
              ].join(" ")
            }
          >
            <Icon className="shrink-0" size={18} />
            {!collapsed ? <span className="min-w-0 truncate">{item.menuName}</span> : null}
          </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

const isPlatformAdminMenu = (menu: MenuPermission) => {
  const name = menu.menuName.trim().toLowerCase();
  const route = menu.menuRoute.trim().toLowerCase();
  const code = menu.menuCode.trim().toLowerCase();
  return (
    route.startsWith("/platform-admin") ||
    name === "platform administration" ||
    name.startsWith("platform admin") ||
    code.includes("platform_admin")
  );
};

const filterCompanyMenus = (menus: MenuPermission[]): MenuPermission[] =>
  menus
    .filter((menu) => menu.canView && !isPlatformAdminMenu(menu))
    .map((menu) => ({
      ...menu,
      children: filterCompanyMenus(menu.children ?? [])
    }))
    .filter((menu) => menu.menuRoute || (menu.children?.length ?? 0) > 0)
    .sort((a, b) => a.displayOrder - b.displayOrder);

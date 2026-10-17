import { ChevronDown, ChevronLeft, Menu, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { resolveAssetUrl } from "../config/env";
import { resolveMenuIcon } from "../config/menuIcons";
import { useAuth } from "../context/AuthContext";
import { compareMenuOrder } from "../lib/menu";
import type { MenuPermission } from "../types/api";

const OPEN_MENUS_KEY = "billing_sidebar_open_menus";

const readOpenMenus = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(OPEN_MENUS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const routeActive = (pathname: string, route?: string | null) => {
  if (!route) {
    return false;
  }
  return pathname === route || pathname.startsWith(`${route}/`);
};

const visibleChildren = (menu: MenuPermission) =>
  (menu.children ?? []).filter((child) => child.canView).sort(compareMenuOrder);

const menuContainsActive = (menu: MenuPermission, pathname: string): boolean => {
  if (routeActive(pathname, menu.menuRoute)) {
    return true;
  }
  return visibleChildren(menu).some((child) => menuContainsActive(child, pathname));
};

const findAncestorKeys = (items: MenuPermission[], targetKey: string, trail: string[] = []): string[] | null => {
  for (const item of items) {
    const key = String(item.id);
    if (key === targetKey) {
      return trail;
    }
    const found = findAncestorKeys(visibleChildren(item), targetKey, [...trail, key]);
    if (found) {
      return found;
    }
  }
  return null;
};

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

const navRowClass = ({
  collapsed,
  highlighted,
  filled = false,
  dense = false
}: {
  collapsed: boolean;
  highlighted: boolean;
  filled?: boolean;
  dense?: boolean;
}) => {
  const state = highlighted
    ? filled
      ? "bg-[image:var(--theme-gradient)] text-[var(--theme-contrast)] shadow-[0_4px_14px_rgba(2,6,23,0.22)]"
      : "text-white"
    : "text-[color:var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)] hover:text-white";
  return [
    "flex w-full items-center rounded-[5px] transition-all duration-300",
    collapsed ? "justify-center p-2" : dense ? "gap-0 px-2.5 py-1.5" : "gap-2 px-2.5 py-1.5",
    state
  ].join(" ");
};

const MenuLeading = ({ iconName, depth }: { iconName?: string | null; depth: number }) => {
  if (depth > 0) {
    return <span className="sidebar-dot-icon mr-[7px]" />;
  }
  const Icon = resolveMenuIcon(iconName);
  return <Icon className="shrink-0" size={17} />;
};

export const Sidebar = ({ collapsed, mobileOpen, onToggleCollapsed, onCloseMobile }: SidebarProps) => {
  const { user, permissions, platform, sessionType, isPlatformAdmin } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(readOpenMenus);
  const [tooltip, setTooltip] = useState<{ name: string; top: number } | null>(null);
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
            { id: -5, menuName: "Settings", menuIcon: "Settings", menuRoute: "/platform-admin/settings", displayOrder: 3, canView: true, actions: [], children: [] },
            { id: -6, menuName: "Dump Manager", menuIcon: "DatabaseBackup", menuRoute: "/platform-admin/dumps", displayOrder: 4, canView: true, actions: [], children: [] }
          ]
        }
      ] as unknown as MenuPermission[];
    }
    return filterCompanyMenus(permissions?.menus ?? []);
  }, [isPlatformAdmin, permissions?.menus]);

  useEffect(() => {
    setOpenMenus((current) => {
      const wanted: Record<string, boolean> = {};
      const visit = (items: MenuPermission[]) => {
        items.forEach((item) => {
          const children = visibleChildren(item);
          if (!children.length) {
            return;
          }
          if (children.some((child) => menuContainsActive(child, location.pathname)) || menuContainsActive(item, location.pathname)) {
            wanted[String(item.id)] = true;
          }
          visit(children);
        });
      };
      visit(menus);
      const currentKeys = Object.keys(current);
      const wantedKeys = Object.keys(wanted);
      const changed =
        currentKeys.length !== wantedKeys.length ||
        wantedKeys.some((key) => !current[key]);
      return changed ? wanted : current;
    });
  }, [location.pathname, menus]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_MENUS_KEY, JSON.stringify(openMenus));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [openMenus]);

  const company = user?.company;
  const companyLogoUrl = resolveAssetUrl(company?.logoUrl);
  const title = sessionType === "platform-admin" ? (platform.platformName || "Platform Admin") : (company?.name ?? "Workspace");
  const subtitle = sessionType === "platform-admin" ? "Platform Administrator" : (user?.superAdmin ? "Super Admin" : (user?.role ?? "User"));

  const toggleMenu = (key: string) => {
    if (collapsed) {
      onToggleCollapsed();
      return;
    }
    setOpenMenus((current) => {
      if (current[key]) {
        return { ...current, [key]: false };
      }
      const ancestors = findAncestorKeys(menus, key) ?? [];
      const next: Record<string, boolean> = {};
      ancestors.forEach((ancestorKey) => {
        next[ancestorKey] = true;
      });
      next[key] = true;
      return next;
    });
  };

  const handleModuleHover = (name: string, event: { currentTarget: HTMLElement }) => {
    if (!collapsed) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ name, top: rect.top + rect.height / 2 });
  };

  const renderLeaf = (item: MenuPermission, depth: number) => {
    const route = item.menuRoute || "";
    if (!route) {
      return null;
    }
    const isActive = routeActive(location.pathname, route);
    return (
      <li key={item.id}>
        <NavLink
          to={route}
          onClick={onCloseMobile}
          onMouseEnter={(event) => handleModuleHover(item.menuName, event)}
          onMouseLeave={() => setTooltip(null)}
          className={navRowClass({ collapsed, highlighted: isActive, filled: true, dense: depth > 0 })}
        >
          <MenuLeading iconName={item.menuIcon} depth={depth} />
          {!collapsed ? <span className="fs-13 min-w-0 truncate font-medium">{item.menuName}</span> : null}
        </NavLink>
      </li>
    );
  };

  const renderGroup = (item: MenuPermission, depth: number) => {
    const children = visibleChildren(item);
    const key = String(item.id);
    const isOpen = Boolean(openMenus[key]) && !collapsed;
    const hasActiveChild = children.some((child) => menuContainsActive(child, location.pathname));
    return (
      <li key={item.id}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={item.menuName}
          onMouseEnter={(event) => handleModuleHover(item.menuName, event)}
          onMouseLeave={() => setTooltip(null)}
          onFocus={(event) => handleModuleHover(item.menuName, event)}
          onBlur={() => setTooltip(null)}
          onClick={() => toggleMenu(key)}
          className={navRowClass({ collapsed, highlighted: hasActiveChild })}
        >
          <MenuLeading iconName={item.menuIcon} depth={depth} />
          {!collapsed ? (
            <>
              <span className="fs-13 min-w-0 flex-1 truncate text-left font-medium">{item.menuName}</span>
              <ChevronDown size={15} className={`shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </>
          ) : null}
        </button>
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: isOpen ? 900 : 0, opacity: isOpen ? 1 : 0, visibility: isOpen ? "visible" : "hidden" }}
        >
          <ul className={depth === 0 ? "space-y-[4px] pl-3 pt-[4px]" : "space-y-[4px] pl-3 pt-[4px]"}>
            {children.map((child) => (visibleChildren(child).length ? renderGroup(child, depth + 1) : renderLeaf(child, depth + 1)))}
          </ul>
        </div>
      </li>
    );
  };

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-50 flex flex-col text-white shadow-[0_22px_55px_rgba(7,19,48,0.18)] transition-[width,transform] duration-300 lg:translate-x-0",
        collapsed ? "w-[70px]" : "w-[240px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      ].join(" ")}
      style={{ background: "linear-gradient(180deg, var(--sidebar-bg), var(--sidebar-bg-deep))" }}
    >
      <div className={`flex h-[60px] shrink-0 items-center border-b border-white/10 ${collapsed ? "justify-center px-2" : "gap-2.5 px-3"}`}>
        {collapsed ? (
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-[5px] text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Expand sidebar"
            title={title}
            onClick={onToggleCollapsed}
          >
            <Menu size={18} />
          </button>
        ) : (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
              {sessionType !== "platform-admin" && companyLogoUrl ? (
                <img src={companyLogoUrl} alt={`${company?.name ?? "Company"} logo`} className="h-full w-full object-contain p-0.5" />
              ) : (
                <ReceiptText className="text-[var(--theme-color)]" size={20} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="fs-14 truncate font-bold text-white">{title}</p>
              <p className="fs-11 truncate text-white/55">{subtitle}</p>
            </div>
            <button
              type="button"
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[5px] text-white/70 transition hover:bg-white/10 hover:text-white lg:flex"
              aria-label="Collapse sidebar"
              onClick={onToggleCollapsed}
            >
              <ChevronLeft size={16} />
            </button>
          </>
        )}
      </div>

      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
        <ul className="space-y-[5px]">
          {menus.map((item) => (visibleChildren(item).length ? renderGroup(item, 0) : renderLeaf(item, 0)))}
        </ul>
      </nav>

      {collapsed && tooltip ? (
        <div
          className="fs-13 pointer-events-none fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded bg-[#222222] px-2.5 py-1.5 font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
          style={{ top: tooltip.top, left: 78 }}
        >
          {tooltip.name}
        </div>
      ) : null}
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
    .sort(compareMenuOrder);

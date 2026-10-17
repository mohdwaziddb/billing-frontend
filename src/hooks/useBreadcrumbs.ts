import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { BreadcrumbItem } from "../components/CommonBreadcrumb";
import { useAuth } from "../context/AuthContext";
import { useMenuCode } from "../context/MenuContext";
import { findMenuTrailByCode, findMenuTrailByRoute, isMenuGroup, type MenuTrailNode } from "../lib/menu";
import type { MenuPermission } from "../types/api";

const toItem = (menu: MenuPermission): BreadcrumbItem => ({
  label: menu.menuName.trim(),
  to: isMenuGroup(menu) ? undefined : menu.menuRoute || undefined
});

const toItems = (node: MenuTrailNode | null): BreadcrumbItem[] =>
  node ? [...node.trail, node.menu].map(toItem) : [];

/**
 * Sidebar menu tree se current page ka breadcrumb trail nikalta hai.
 * Pehle route ke menuCode se (exact), warna URL path se match karke.
 */
export const useBreadcrumbs = (): BreadcrumbItem[] => {
  const menuCode = useMenuCode();
  const { permissions } = useAuth();
  const location = useLocation();

  return useMemo(() => {
    const menus = permissions?.menus ?? [];
    if (menuCode) {
      const byCode = findMenuTrailByCode(menus, menuCode);
      if (byCode) {
        return toItems(byCode);
      }
    }
    return toItems(findMenuTrailByRoute(menus, location.pathname));
  }, [menuCode, permissions?.menus, location.pathname]);
};

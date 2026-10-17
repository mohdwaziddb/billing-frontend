import type { MenuPermission } from "../types/api";

// Children wala menu sirf sidebar group/folder hai, koi page nahi — isliye
// ise kabhi navigate nahi karna. Yeh ek hi jagah tay hota hai taaki Sidebar,
// breadcrumb, search aur landing route sab same behaviour follow karein.
export const isMenuGroup = (menu: Pick<MenuPermission, "children">): boolean =>
  (menu.children?.length ?? 0) > 0;

// Order sirf data se aata hai (displayOrder), koi hardcoded menu code nahi.
export const compareMenuOrder = (a: { displayOrder: number }, b: { displayOrder: number }): number =>
  a.displayOrder - b.displayOrder;

export type MenuTrailNode = { menu: MenuPermission; trail: MenuPermission[] };

const routeMatches = (pathname: string, route?: string | null) => {
  if (!route) {
    return false;
  }
  const clean = route.replace(/\/+$/, "");
  return pathname === clean || pathname.startsWith(`${clean}/`);
};

// Ek hi traversal sabke liye: canView menus ko sidebar order me flatten karta
// hai aur har menu ka ancestor trail deta hai (breadcrumb + search common).
export const flattenMenuTrails = (menus: MenuPermission[]): MenuTrailNode[] => {
  const nodes: MenuTrailNode[] = [];
  const visit = (items: MenuPermission[], trail: MenuPermission[]) => {
    items
      .filter((menu) => menu.canView)
      .sort(compareMenuOrder)
      .forEach((menu) => {
        nodes.push({ menu, trail });
        if (menu.children?.length) {
          visit(menu.children, [...trail, menu]);
        }
      });
  };
  visit(menus, []);
  return nodes;
};

export const findMenuTrailByCode = (menus: MenuPermission[], code: string): MenuTrailNode | null =>
  flattenMenuTrails(menus).find((node) => node.menu.menuCode === code) ?? null;

export const findMenuTrailByRoute = (menus: MenuPermission[], pathname: string): MenuTrailNode | null => {
  let best: MenuTrailNode | null = null;
  for (const node of flattenMenuTrails(menus)) {
    if (!routeMatches(pathname, node.menu.menuRoute)) {
      continue;
    }
    if (!best || node.menu.menuRoute.length > best.menu.menuRoute.length) {
      best = node;
    }
  }
  return best;
};

// Search keywords poori menu history se bante hain (naam, code, route, saare
// parent names) plus compact variant — taaki "subcategories" jaisi joined
// queries bhi match ho. Koi hardcoded alias nahi.
export const menuSearchKeywords = (menu: MenuPermission, trail: MenuPermission[]): string => {
  const parts = [menu.menuName, menu.menuCode, menu.menuRoute, ...trail.map((item) => item.menuName)];
  const joined = parts.join(" ").toLowerCase();
  const compact = joined.replace(/[^a-z0-9]+/g, "");
  return `${joined} ${compact}`;
};

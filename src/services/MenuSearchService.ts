import type { MenuPermission } from "../types/api";

export type MenuSearchResult = {
  id: number;
  label: string;
  route: string;
  icon: string | null;
  menuCode: string;
  keywords: string;
};

const menuAlias = (menu: MenuPermission) => {
  if (menu.menuCode === "SETUP") {
    return "Settings";
  }
  if (menu.menuCode === "PRODUCT_CATEGORY") {
    return "Product Categories Categories";
  }
  if (menu.menuCode === "CREATE_INVOICE") {
    return "Create Invoice Invoice Billing";
  }
  return "";
};

const displayName = (menu: MenuPermission) => (menu.menuCode === "SETUP" ? "Settings" : menu.menuName);

const flattenMenus = (menus: MenuPermission[]): MenuSearchResult[] => {
  const results: MenuSearchResult[] = [];

  const visit = (items: MenuPermission[]) => {
    items
      .filter((menu) => menu.canView)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach((menu) => {
        if (menu.menuRoute) {
          const label = displayName(menu);
          results.push({
            id: menu.id,
            label,
            route: menu.menuRoute,
            icon: menu.menuIcon,
            menuCode: menu.menuCode,
            keywords: `${label} ${menu.menuName} ${menu.menuCode} ${menuAlias(menu)}`.toLowerCase()
          });
        }
        if (menu.children?.length) {
          visit(menu.children);
        }
      });
  };

  visit(menus);
  return results;
};

export const MenuSearchService = {
  search(query: string, menus: MenuPermission[]) {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 3) {
      return [];
    }

    return flattenMenus(menus)
      .filter((menu) => menu.keywords.includes(normalized))
      .slice(0, 8);
  }
};

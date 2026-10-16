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
  if (menu.menuCode === "PRODUCT_SUB_CATEGORIES") {
    return "Product Sub Categories Subcategories";
  }
  if (menu.menuCode === "CREATE_INVOICE") {
    return "Create Invoice Invoice Billing";
  }
  return "";
};

const displayName = (menu: MenuPermission) => (menu.menuCode === "SETUP" ? "Settings" : menu.menuName);

// Setup always renders last in the menu list, regardless of displayOrder.
// Shared by Sidebar, search results and login landing route.
export const compareMenuOrder = (
  a: { menuCode?: string; displayOrder: number },
  b: { menuCode?: string; displayOrder: number }
): number =>
  (a.menuCode === "SETUP" ? 1 : 0) - (b.menuCode === "SETUP" ? 1 : 0) ||
  a.displayOrder - b.displayOrder;

const flattenMenus = (menus: MenuPermission[]): MenuSearchResult[] => {
  const results: MenuSearchResult[] = [];

  const visit = (items: MenuPermission[]) => {
    items
      .filter((menu) => menu.canView)
      .sort(compareMenuOrder)
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

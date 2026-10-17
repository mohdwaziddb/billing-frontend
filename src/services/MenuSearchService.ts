import { flattenMenuTrails, isMenuGroup, menuSearchKeywords } from "../lib/menu";
import type { MenuPermission } from "../types/api";

export type MenuSearchResult = {
  id: number;
  label: string;
  route: string;
  icon: string | null;
  menuCode: string;
  keywords: string;
  parentPath: string;
};

const flattenMenus = (menus: MenuPermission[]): MenuSearchResult[] =>
  flattenMenuTrails(menus)
    .filter(({ menu }) => !isMenuGroup(menu) && menu.menuRoute)
    .map(({ menu, trail }) => ({
      id: menu.id,
      label: menu.menuName,
      route: menu.menuRoute,
      icon: menu.menuIcon,
      menuCode: menu.menuCode,
      keywords: menuSearchKeywords(menu, trail),
      parentPath: trail.map((item) => item.menuName).join(" > ")
    }));

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

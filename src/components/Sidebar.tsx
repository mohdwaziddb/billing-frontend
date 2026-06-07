import {
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  Palette,
  Users,
  Tags,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

export const Sidebar = () => {
  const { user, permissions, logout } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({});
  const menus = useMemo(
    () => permissions?.menus.filter((menu) => menu.canView).sort((a, b) => a.displayOrder - b.displayOrder) ?? [],
    [permissions?.menus]
  );

  useEffect(() => {
    const activeParent = menus.find((menu) => (menu.children ?? []).some((child) => child.menuRoute === location.pathname));
    if (!activeParent) {
      return;
    }
    setOpenMenus((current) => (current[activeParent.id] ? current : { ...current, [activeParent.id]: true }));
  }, [location.pathname, menus]);

  return (
    <aside className="glass flex w-full flex-col rounded-[var(--radius-panel)] p-4 md:p-5 lg:h-full lg:max-h-[calc(100vh-2rem)]">
      <div className="mb-4 shrink-0 rounded-[24px] border border-white/10 bg-white/5 p-4 xl:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-sky-400/20 to-cyan-300/10 p-3">
            <ReceiptText className="text-sky-100" size={22} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-sky-200/70">NovaBill</p>
            <h2 className="text-2xl font-extrabold tracking-tight gradient-text">Billing Suite</h2>
          </div>
        </div>
        <div className="mt-6 text-sm text-slate-300/80">
          <p className="font-semibold text-white">{user?.fullName}</p>
          <p className="mt-1 text-slate-400">{user?.role.replace(/_/g, " ")}</p>
          <p className="mt-2 text-slate-400">{user?.company?.name ?? "Platform Access"}</p>
        </div>
      </div>

      <nav className="scrollbar-thin -mr-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden pr-2">
        {menus.map((item) => {
          const Icon = item.menuIcon ? iconMap[item.menuIcon] ?? LayoutDashboard : LayoutDashboard;
          const children = (item.children ?? []).filter((child) => child.canView).sort((a, b) => a.displayOrder - b.displayOrder);
          if (children.length) {
            const isOpen = Boolean(openMenus[item.id]);
            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center gap-3 rounded-[22px] border border-transparent px-4 py-3 text-left text-sm font-semibold text-slate-300/80 transition hover:bg-white/6 hover:text-white"
                  onClick={() => setOpenMenus((current) => ({ ...current, [item.id]: !current[item.id] }))}
                  aria-expanded={isOpen}
                >
                  <Icon className="shrink-0" size={18} />
                  <span className="min-w-0 flex-1 truncate">{item.menuName}</span>
                  <ChevronDown className={isOpen ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} size={16} />
                </button>
                {isOpen ? (
                  <div className="ml-5 flex flex-col gap-1 border-l border-white/10 pl-3 pr-1">
                    {children.map((child) => {
                      const ChildIcon = child.menuIcon ? iconMap[child.menuIcon] ?? LayoutDashboard : LayoutDashboard;
                      return (
                        <NavLink
                          key={child.id}
                          to={child.menuRoute}
                          className={({ isActive }) =>
                            [
                              "min-h-10 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition flex items-center gap-3",
                              isActive
                                ? "neon-border border border-[color:color-mix(in_srgb,var(--theme-border)_28%,transparent)] bg-[color-mix(in_srgb,var(--theme-color)_18%,transparent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                                : "border border-transparent text-slate-300/80 hover:bg-white/6 hover:text-white"
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
            end={item.menuRoute === "/dashboard" || item.menuRoute === "/create-invoice" || item.menuRoute === "/payments" || item.menuRoute === "/outstanding" || item.menuRoute === "/analytics"}
            className={({ isActive }) =>
              [
                "min-h-12 rounded-[22px] px-4 py-3 text-sm font-semibold transition flex items-center gap-3",
                isActive
                  ? "neon-border border border-[color:color-mix(in_srgb,var(--theme-border)_28%,transparent)] bg-[color-mix(in_srgb,var(--theme-color)_18%,transparent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border border-transparent text-slate-300/80 hover:bg-white/6 hover:text-white"
              ].join(" ")
            }
          >
            <Icon className="shrink-0" size={18} />
            <span className="min-w-0 truncate">{item.menuName}</span>
          </NavLink>
          );
        })}
      </nav>

      <button
        className="mt-4 flex min-h-11 shrink-0 items-center gap-3 rounded-[22px] border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300/80 transition hover:bg-white/6 hover:text-white"
        onClick={() => void logout()}
      >
        <LogOut className="shrink-0" size={18} />
        <span className="min-w-0 truncate">Logout</span>
      </button>
    </aside>
  );
};

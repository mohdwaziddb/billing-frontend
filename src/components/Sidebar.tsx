import {
  BarChart3,
  Boxes,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  Users,
  Wallet
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/customers", label: "Customers", icon: Users, end: false },
  { to: "/products", label: "Products", icon: Boxes, end: false },
  { to: "/invoices/new", label: "Create Invoice", icon: FilePlus2, end: true },
  { to: "/invoices", label: "Invoices", icon: FileText, end: true },
  { to: "/payments/new", label: "Payments", icon: CreditCard, end: true },
  { to: "/outstanding-customers", label: "Outstanding", icon: Wallet, end: true },
  { to: "/sales-analytics", label: "Analytics", icon: BarChart3, end: true },
  { to: "/users", label: "Users", icon: ShieldCheck, end: true, ownerOnly: true }
];

export const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="glass flex w-full flex-col rounded-[var(--radius-panel)] p-4 md:p-5 lg:min-h-[calc(100vh-2rem)]">
      <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-5">
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

      <nav className="flex flex-1 flex-col gap-1.5">
        {navItems.filter((item) => !item.ownerOnly || user?.role === "OWNER").map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                "rounded-[22px] px-4 py-3 text-sm font-semibold transition flex items-center gap-3",
                isActive
                  ? "neon-border border border-sky-300/20 bg-sky-400/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border border-transparent text-slate-300/80 hover:bg-white/6 hover:text-white"
              ].join(" ")
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        className="mt-6 flex min-h-11 items-center gap-3 rounded-[22px] border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300/80 transition hover:bg-white/6 hover:text-white"
        onClick={() => void logout()}
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
};

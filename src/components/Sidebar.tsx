import {
  BarChart3,
  Boxes,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
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
  { to: "/sales-analytics", label: "Analytics", icon: BarChart3, end: true }
];

export const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="glass flex w-full flex-col rounded-[2rem] p-5 lg:h-full">
      <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-300/20 to-emerald-300/20 p-3">
            <ReceiptText className="text-cyan-100" size={22} />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">NovaBill</p>
            <h2 className="text-2xl font-extrabold gradient-text">Revenue OS</h2>
          </div>
        </div>
        <div className="mt-6 text-sm text-slate-300/80">
          <p className="font-semibold text-white">{user?.fullName}</p>
          <p>{user?.role.replaceAll("_", " ")}</p>
          <p className="mt-2 text-slate-400">{user?.company?.name ?? "Platform Access"}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                "neon-border rounded-2xl px-4 py-3 text-sm font-semibold transition flex items-center gap-3",
                isActive
                  ? "bg-gradient-to-r from-cyan-400/25 to-emerald-300/15 text-white border border-white/15"
                  : "border border-transparent text-slate-300/80 hover:bg-white/8 hover:text-white"
              ].join(" ")
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300/80 transition hover:bg-white/8 hover:text-white"
        onClick={() => void logout()}
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
};

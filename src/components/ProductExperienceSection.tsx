import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, Filter, Plus, ReceiptText, Search, UsersRound, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

const BLUE = "#2453D8";
const NAVY = "#0F172A";
const SUCCESS = "#16A34A";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";

type PreviewCard = {
  title: string;
  description: string;
  route: string;
  preview: React.ReactNode;
};

function DashboardPreview() {
  const navItems = ["Dashboard", "Customers", "Invoices", "Sales", "Collections", "Outstanding"];
  const metrics = [
    { label: "Total Sales", value: "₹86,400", tone: "text-[#0F172A]" },
    { label: "Collected", value: "₹67,350", tone: "text-[#16A34A]" },
    { label: "Outstanding", value: "₹19,050", tone: "text-[#EF4444]" }
  ];
  return (
    <div className="flex h-[200px] overflow-hidden rounded-md border border-[#E2E8F0] bg-white text-left">
      <div className="flex w-[46px] shrink-0 flex-col bg-[#0F172A] py-2">
        <div className="px-1.5 pb-2 text-[8px] font-extrabold text-white">Bizio</div>
        <div className="space-y-0.5 px-1">
          {navItems.map((item, index) => (
            <div
              key={item}
              className={`flex items-center gap-1 rounded px-1 py-1 text-[6.5px] font-medium ${index === 0 ? "bg-[#2453D8] text-white" : "text-slate-400"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-sm ${index === 0 ? "bg-white" : "bg-slate-500"}`} />
              <span className="truncate">{item}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-[#F8FAFC] p-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold text-[#0F172A]">Dashboard</p>
          <span className="rounded bg-white px-1 py-0.5 text-[6px] text-slate-400 ring-1 ring-[#E2E8F0]">This week</span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-md bg-white p-1 ring-1 ring-[#E2E8F0]">
              <p className="text-[5.5px] font-semibold text-slate-400">{metric.label}</p>
              <p className={`mt-0.5 text-[9px] font-bold ${metric.tone}`}>{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-[1.45fr_1fr] gap-1">
          <div className="rounded-md bg-white p-1 ring-1 ring-[#E2E8F0]">
            <p className="text-[6px] font-semibold text-slate-500">Sales Trend</p>
            <svg viewBox="0 0 100 32" className="mt-0.5 h-8 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="bizioSalesArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 27 C 11 23, 17 26, 27 21 S 43 24, 53 17 S 69 19, 80 11 S 93 9, 100 5 L 100 32 L 0 32 Z"
                fill="url(#bizioSalesArea)"
              />
              <path
                d="M0 27 C 11 23, 17 26, 27 21 S 43 24, 53 17 S 69 19, 80 11 S 93 9, 100 5"
                fill="none"
                stroke={BLUE}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="flex flex-col rounded-md bg-white p-1 ring-1 ring-[#E2E8F0]">
            <p className="text-[6px] font-semibold text-slate-500">Collection</p>
            <div className="relative mx-auto mt-0.5 h-9 w-9">
              <svg viewBox="0 0 36 36" className="h-full w-full">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={BLUE}
                  strokeWidth="4"
                  strokeDasharray="69 88"
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-[#0F172A]">78%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomersPreview() {
  const rows = [
    { name: "ABC Traders", phone: "98xxxxxx", balance: "₹12,500", color: BLUE },
    { name: "Sharma Stores", phone: "97xxxxxx", balance: "₹4,850", color: SUCCESS },
    { name: "Kumar Enterprises", phone: "96xxxxxx", balance: "₹8,200", color: WARNING }
  ];
  return (
    <div className="h-[200px] overflow-hidden rounded-md border border-[#E2E8F0] bg-white text-left">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-2 py-1.5">
        <p className="text-[8.5px] font-bold text-[#0F172A]">Customers</p>
        <span className="flex items-center gap-0.5 rounded bg-[#2453D8] px-1.5 py-0.5 text-[6.5px] font-semibold text-white">
          <Plus size={7} strokeWidth={3} />
          Add Customer
        </span>
      </div>
      <div className="mx-2 mt-1.5 flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1">
        <Search size={8} className="text-slate-400" />
        <span className="text-[6.5px] text-slate-400">Search customers...</span>
      </div>
      <div className="mt-1.5 px-2">
        <div className="grid grid-cols-[1.45fr_1fr_0.8fr] gap-1 border-b border-[#E2E8F0] pb-1 text-[6px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Customer</span>
          <span>Phone</span>
          <span className="text-right">Balance</span>
        </div>
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[1.45fr_1fr_0.8fr] items-center gap-1 border-b border-slate-100 py-1.5">
            <span className="flex min-w-0 items-center gap-1">
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[6px] font-bold text-white"
                style={{ backgroundColor: row.color }}
              >
                {row.name.charAt(0)}
              </span>
              <span className="truncate text-[7px] font-medium text-slate-700">{row.name}</span>
            </span>
            <span className="text-[7px] text-slate-400">{row.phone}</span>
            <span className="text-right text-[7px] font-semibold text-slate-700">{row.balance}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoicesPreview() {
  const rows = [
    { no: "INV-1024", customer: "ABC Traders", amount: "₹8,400", status: "Paid", badge: "bg-[#16A34A]/10 text-[#16A34A]" },
    { no: "INV-1025", customer: "Sharma Stores", amount: "₹5,200", status: "Pending", badge: "bg-[#F59E0B]/10 text-[#F59E0B]" },
    { no: "INV-1026", customer: "Kumar Enterprises", amount: "₹9,800", status: "Paid", badge: "bg-[#16A34A]/10 text-[#16A34A]" },
    { no: "INV-1027", customer: "XYZ Business", amount: "₹3,500", status: "Overdue", badge: "bg-[#EF4444]/10 text-[#EF4444]" }
  ];
  return (
    <div className="h-[200px] overflow-hidden rounded-md border border-[#E2E8F0] bg-white text-left">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-2 py-1.5">
        <p className="text-[8.5px] font-bold text-[#0F172A]">Invoices</p>
        <span className="flex items-center gap-0.5 rounded bg-[#2453D8] px-1.5 py-0.5 text-[6.5px] font-semibold text-white">
          <Plus size={7} strokeWidth={3} />
          Create Invoice
        </span>
      </div>
      <div className="mx-2 mt-1.5 flex items-center gap-1">
        <div className="flex flex-1 items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1">
          <Search size={8} className="text-slate-400" />
          <span className="text-[6.5px] text-slate-400">Search</span>
        </div>
        <span className="flex items-center gap-0.5 rounded-md bg-white px-1.5 py-1 text-[6.5px] font-medium text-slate-500 ring-1 ring-[#E2E8F0]">
          <Filter size={7} />
          Filter
        </span>
      </div>
      <div className="mt-1.5 px-2">
        <div className="grid grid-cols-[0.9fr_1.3fr_0.7fr_0.75fr] gap-1 border-b border-[#E2E8F0] pb-1 text-[6px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Invoice</span>
          <span>Customer</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Status</span>
        </div>
        {rows.map((row) => (
          <div key={row.no} className="grid grid-cols-[0.9fr_1.3fr_0.7fr_0.75fr] items-center gap-1 border-b border-slate-100 py-1.5">
            <span className="text-[7px] font-semibold text-[#2453D8]">{row.no}</span>
            <span className="truncate text-[7px] text-slate-600">{row.customer}</span>
            <span className="text-right text-[7px] font-semibold text-slate-700">{row.amount}</span>
            <span className={`justify-self-end rounded px-1 py-0.5 text-[6px] font-semibold ${row.badge}`}>{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectionsPreview() {
  const summary = [
    { label: "Collected", value: "₹67,350", tone: "text-[#16A34A]" },
    { label: "Pending", value: "₹12,500", tone: "text-[#F59E0B]" },
    { label: "Outstanding", value: "₹19,050", tone: "text-[#EF4444]" }
  ];
  const rows = [
    { name: "ABC Traders", amount: "₹8,400", status: "Collected", tone: "text-[#16A34A]" },
    { name: "Sharma Stores", amount: "₹5,200", status: "Pending", tone: "text-[#F59E0B]" },
    { name: "Kumar Enterprises", amount: "₹9,800", status: "Collected", tone: "text-[#16A34A]" }
  ];
  return (
    <div className="h-[200px] overflow-hidden rounded-md border border-[#E2E8F0] bg-white text-left">
      <div className="border-b border-[#E2E8F0] px-2 py-1.5">
        <p className="text-[8.5px] font-bold text-[#0F172A]">Collections</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {summary.map((item) => (
            <div key={item.label} className="rounded-md bg-slate-50 px-1 py-1">
              <p className="text-[5.5px] font-semibold text-slate-400">{item.label}</p>
              <p className={`mt-0.5 text-[8px] font-bold ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 px-2">
        <div className="grid grid-cols-[1.6fr_0.8fr_0.9fr] gap-1 border-b border-[#E2E8F0] pb-1 text-[6px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Customer</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Status</span>
        </div>
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[1.6fr_0.8fr_0.9fr] items-center gap-1 border-b border-slate-100 py-1.5">
            <span className="truncate text-[7px] text-slate-600">{row.name}</span>
            <span className="text-right text-[7px] font-semibold text-slate-700">{row.amount}</span>
            <span className={`flex items-center justify-end gap-0.5 text-[6.5px] font-semibold ${row.tone}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.tone.includes("16A34A") ? SUCCESS : WARNING }} />
              {row.status}
            </span>
          </div>
        ))}
        <div className="mt-2 rounded-md bg-slate-50 p-1">
          <div className="flex items-center justify-between">
            <span className="text-[6px] font-semibold text-slate-400">Collection Rate</span>
            <span className="text-[6.5px] font-bold text-[#0F172A]">78%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[#16A34A]" style={{ width: "78%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const cards: PreviewCard[] = [
  {
    title: "Dashboard",
    description: "See all important business numbers in one place.",
    route: "/dashboard",
    preview: <DashboardPreview />
  },
  {
    title: "Customers",
    description: "Manage customer details and transaction history.",
    route: "/customers",
    preview: <CustomersPreview />
  },
  {
    title: "Invoices",
    description: "Create and manage invoices with ease.",
    route: "/invoices",
    preview: <InvoicesPreview />
  },
  {
    title: "Collections",
    description: "Record collections and track payment status.",
    route: "/payments",
    preview: <CollectionsPreview />
  }
];

export const ProductExperienceSection = () => {
  return (
    <section className="bg-[#F8FAFC] px-4 py-20 sm:px-6" aria-labelledby="workspace-heading">
      <div className="mx-auto max-w-[1200px]">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#2453D8]">Product Experience</p>
          <h2
            id="workspace-heading"
            className="mt-4 text-[28px] font-extrabold leading-[1.15] tracking-tight text-[#0F172A] sm:text-4xl"
          >
            A Workspace for Your Everyday Business
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-sm leading-6 text-[#64748B] sm:text-[15px]">
            Bizio includes dedicated screens for the workflows your business manages every day.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              to={card.route}
              className="group block overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#2453D8]/35 hover:shadow-[0_24px_50px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-[#E2E8F0] bg-slate-50/70 p-2.5">
                <div className="transition-transform duration-300 group-hover:scale-[1.01]">{card.preview}</div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-bold text-[#111827]">{card.title}</h3>
                  <span className="flex items-center gap-1 text-xs font-semibold text-[#2453D8] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    View
                    <ArrowRight size={14} />
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 text-[#64748B]">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export type { PreviewCard };

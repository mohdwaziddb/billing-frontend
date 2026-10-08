import { BarChart3, CheckCircle2, CircleDollarSign, Clock3, LineChart, TrendingUp, Wallet } from "lucide-react";
import { LoginBrand } from "./LoginBrand";

const IN = "₹";

const METRICS: Array<{
  label: string;
  value: string;
  change?: string;
  tone: string;
  changeTone?: string;
  icon: typeof TrendingUp;
}> = [
  {
    label: "Total Sales",
    value: `${IN}86,400`,
    change: "+12.4%",
    tone: "text-slate-900",
    changeTone: "text-emerald-600",
    icon: TrendingUp
  },
  {
    label: "Collected",
    value: `${IN}67,350`,
    change: "+8.2%",
    tone: "text-[#16A34A]",
    changeTone: "text-emerald-600",
    icon: Wallet
  },
  {
    label: "Outstanding",
    value: `${IN}19,050`,
    tone: "text-amber-600",
    icon: CircleDollarSign
  }
];

const SALES_SERIES = [42, 58, 46, 70, 62, 84, 76];
const SALES_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CHART_WIDTH = 320;
const CHART_HEIGHT = 118;
const CHART_TOP = 8;
const CHART_BOTTOM = 82;
const SERIES_MAX = 90;
const SERIES_MIN = 38;

type ChartPoint = { x: number; y: number };

const buildChartPoints = (): ChartPoint[] => {
  const innerHeight = CHART_BOTTOM - CHART_TOP;
  return SALES_SERIES.map((value, index) => ({
    x: 12 + (index * (CHART_WIDTH - 24)) / (SALES_SERIES.length - 1),
    y: CHART_BOTTOM - ((value - SERIES_MIN) / (SERIES_MAX - SERIES_MIN)) * innerHeight
  }));
};

const SalesTrendChart = () => {
  const points = buildChartPoints();
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(1)} ${CHART_BOTTOM} L${points[0].x.toFixed(1)} ${CHART_BOTTOM} Z`;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label="Weekly sales trend chart (illustrative)"
      className="h-[96px] w-full"
    >
      <defs>
        <linearGradient id="login-sales-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2453d8" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2453d8" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[CHART_BOTTOM - 24, CHART_BOTTOM - 48, CHART_BOTTOM - 72].map((y) => (
        <line key={y} x1={12} x2={CHART_WIDTH - 12} y1={y} y2={y} stroke="#EEF2F7" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#login-sales-area)" />
      <path d={line} fill="none" stroke="#2453d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <g key={index}>
          <circle cx={point.x} cy={point.y} r="3.4" fill="#ffffff" stroke="#2453d8" strokeWidth="2" />
          <text
            x={point.x}
            y={CHART_HEIGHT - 6}
            textAnchor="middle"
            className="fill-slate-400"
            style={{ fontSize: 8.5, fontWeight: 700 }}
          >
            {SALES_DAYS[index]}
          </text>
        </g>
      ))}
    </svg>
  );
};

const DONUT_RADIUS = 30;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const COLLECTION_RATE = 0.78;

const CollectionDonut = () => (
  <svg viewBox="0 0 76 76" className="h-[76px] w-[76px] -rotate-90" aria-hidden>
    <circle cx="38" cy="38" r={DONUT_RADIUS} fill="none" stroke="#E6EDFB" strokeWidth="9" />
    <circle
      cx="38"
      cy="38"
      r={DONUT_RADIUS}
      fill="none"
      stroke="#2453d8"
      strokeWidth="9"
      strokeLinecap="round"
      strokeDasharray={`${(COLLECTION_RATE * DONUT_CIRCUMFERENCE).toFixed(1)} ${DONUT_CIRCUMFERENCE.toFixed(1)}`}
    />
  </svg>
);

const TRANSACTIONS = [
  { name: "ABC Traders", amount: `${IN}8,400`, status: "Paid" as const },
  { name: "Sharma Stores", amount: `${IN}5,200`, status: "Paid" as const },
  { name: "Kumar Enterprises", amount: `${IN}3,500`, status: "Pending" as const }
];

const TransactionStatusBadge = ({ status }: { status: "Paid" | "Pending" }) => {
  const isPaid = status === "Paid";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-extrabold ${
        isPaid ? "bg-emerald-50 text-[#15803D]" : "bg-amber-50 text-[#B45309]"
      }`}
    >
      {isPaid ? <CheckCircle2 size={9} /> : <Clock3 size={9} />}
      {status}
    </span>
  );
};

const TransactionsCard = () => (
  <div className="rounded-xl border border-slate-100 bg-white p-3.5">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-extrabold text-slate-800">Recent Transactions</p>
      <span className="text-[8px] font-medium text-slate-400">Illustrative</span>
    </div>
    <div className="mt-2 space-y-1.5">
      {TRANSACTIONS.map((transaction) => (
        <div
          key={transaction.name}
          className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2453d8]">
              <BarChart3 size={13} />
            </span>
            <p className="truncate text-[11px] font-bold text-slate-800">{transaction.name}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <b className="text-[11px] tabular-nums text-slate-800">{transaction.amount}</b>
            <TransactionStatusBadge status={transaction.status} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MiniDashboard = () => (
  <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_32px_64px_rgba(36,83,216,0.16)]">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2453d8] text-white shadow-[0_6px_14px_rgba(36,83,216,0.3)]">
          <BarChart3 size={14} />
        </span>
        <div>
          <p className="text-[12px] font-extrabold text-slate-900">Bizio Analytics</p>
          <p className="text-[9px] font-medium text-slate-400">Illustrative dashboard preview</p>
        </div>
      </div>
      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-[#2453d8]">Demo data</span>
    </div>

    <div className="space-y-3 bg-[#f8fafd] p-4">
      <div className="grid grid-cols-3 gap-3">
        {METRICS.map(({ label, value, change, icon: Icon, tone, changeTone }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#2453d8]">
                <Icon size={12} />
              </span>
            </div>
            <p className={`mt-1.5 text-[16px] font-extrabold tracking-tight ${tone}`}>{value}</p>
            {change ? <p className={`mt-0.5 text-[9px] font-bold ${changeTone}`}>{change}</p> : <p className="mt-[11px]" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.45fr_0.95fr] gap-3">
        <div className="rounded-xl border border-slate-100 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-slate-800">Sales Trend</p>
              <p className="text-[8px] text-slate-400">This week</p>
            </div>
            <LineChart size={15} className="text-[#2453d8]" />
          </div>
          <div className="mt-2">
            <SalesTrendChart />
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-slate-100 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold text-slate-800">Collection</p>
            <Wallet size={15} className="text-[#2453d8]" />
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative h-[76px] w-[76px] shrink-0">
              <CollectionDonut />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <b className="text-[13px] leading-none text-slate-900">78%</b>
                <span className="mt-0.5 text-[7px] font-medium text-slate-400">Collected</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-1 text-[9px]">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                  Collected
                </span>
                <b className="tabular-nums text-slate-800">{IN}67,350</b>
              </div>
              <div className="flex items-center justify-between gap-1 text-[9px]">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Pending
                </span>
                <b className="tabular-nums text-slate-800">{IN}19,050</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TransactionsCard />
    </div>
  </div>
);

const FLOATING_BADGES: Array<{
  title: string;
  value: string;
  icon: typeof TrendingUp;
  color: string;
  className: string;
  delay: string;
  duration: string;
}> = [
  {
    title: "Sales Tracking",
    value: "+12.4%",
    icon: TrendingUp,
    color: "#2453d8",
    className: "-left-5 -top-5",
    delay: "0s",
    duration: "7s"
  },
  {
    title: "Collection",
    value: "78% collected",
    icon: Wallet,
    color: "#16A34A",
    className: "-right-7 top-1/3",
    delay: "1.4s",
    duration: "8s"
  },
  {
    title: "Outstanding",
    value: `${IN}19,050`,
    icon: CircleDollarSign,
    color: "#D97706",
    className: "-left-4 bottom-12",
    delay: "0.8s",
    duration: "7.5s"
  }
];

const FloatingBadges = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 z-20">
    {FLOATING_BADGES.map(({ title, value, icon: Icon, color, className, delay, duration }) => (
      <div
        key={title}
        className={`login-float absolute hidden items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-[0_16px_32px_rgba(15,23,42,0.10)] backdrop-blur md:flex ${className}`}
        style={{ animationDelay: delay, animationDuration: duration }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon size={15} />
        </span>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">{title}</p>
          <p className="text-[12px] font-extrabold text-slate-900">{value}</p>
        </div>
      </div>
    ))}
  </div>
);

export const AnalyticsShowcase = () => (
  <aside className="relative hidden overflow-hidden bg-[linear-gradient(165deg,#ffffff_0%,#f6f9ff_55%,#edf3ff_100%)] lg:flex lg:justify-center lg:px-6 lg:py-10 xl:px-10">
    <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#dbe7ff]/80 blur-3xl" />
    <div aria-hidden className="pointer-events-none absolute -left-20 bottom-6 h-64 w-64 rounded-full bg-[#e6eeff]/90 blur-3xl" />
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/3 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60 blur-2xl"
    />

    <div className="relative z-10 mx-auto flex w-full max-w-[500px] flex-col justify-center">
      <LoginBrand />
      <div className="mt-5">
        <span className="inline-flex items-center rounded-full border border-[#d7e3ff] bg-white/80 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2453d8] shadow-[0_6px_16px_rgba(36,83,216,0.08)]">
          Business analytics platform
        </span>
        <h1 className="mt-3 text-[28px] font-black leading-[1.08] tracking-[-0.04em] text-slate-950 xl:text-[32px]">
          Know Your Numbers.
          <br />
          Grow Your Business.
        </h1>
        <p className="mt-2 max-w-[400px] text-[13px] leading-6 text-slate-500">
          Track sales, collections, customers and outstanding payments from one place.
        </p>
      </div>

      <div className="relative mt-5 scale-[0.92] transform-gpu origin-left">
        <MiniDashboard />
        <FloatingBadges />
      </div>
    </div>
  </aside>
);
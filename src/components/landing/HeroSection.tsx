import { ArrowRight, BarChart3, CreditCard, PlayCircle, ReceiptIndianRupee, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { FloatingOrb, Reveal } from "./LandingMotion";

export const HeroSection = () => (
  <section className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl gap-14 px-4 pb-16 pt-16 md:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:pb-24">
    <Reveal className="relative z-10">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#2563EB] shadow-[0_18px_40px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/80">
        <Sparkles size={14} />
        Intelligent Operating Layer For Modern Businesses
      </div>

      <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.06em] text-slate-950 md:text-6xl lg:text-[4.9rem]">
        Smart Billing.
        <br />
        Smarter Business.
      </h1>

      <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
        Manage Billing, Inventory, Customers, Sales, Payments, Reports, Communication and Business Growth from one intelligent platform.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link to="/login" className="inline-flex">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563EB,#06B6D4)] px-7 py-4 text-sm font-black text-white shadow-[0_24px_48px_rgba(37,99,235,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_60px_rgba(37,99,235,0.28)]"
          >
            Login
            <ArrowRight size={16} />
          </button>
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 text-sm font-black text-slate-700 shadow-[0_18px_36px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 transition duration-300 hover:-translate-y-0.5 hover:text-slate-950"
        >
          <PlayCircle size={18} />
          Watch Demo
        </button>
      </div>
    </Reveal>

    <Reveal className="relative" delay={120}>
      <FloatingOrb className="absolute -left-8 top-8 h-36 w-36 rounded-full bg-sky-200/60 blur-3xl" duration="8s" />
      <FloatingOrb className="absolute -right-6 top-16 h-32 w-32 rounded-full bg-cyan-200/70 blur-3xl" duration="10s" />
      <FloatingOrb className="absolute bottom-6 left-20 h-24 w-24 rounded-full bg-violet-200/70 blur-3xl" duration="7s" />

      <div
        className="relative rounded-[40px] bg-white/82 p-4 shadow-[0_42px_110px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80 backdrop-blur-2xl"
        style={{ animation: "landing-float 9s ease-in-out infinite" }}
      >
        <div className="rounded-[32px] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96),rgba(239,246,255,0.88))] p-5 ring-1 ring-white">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Overview</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">Executive Dashboard</h3>
                </div>
                <div className="rounded-2xl bg-[linear-gradient(135deg,#2563EB,#06B6D4)] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                  Live
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Revenue", value: "Rs. 8.4L" },
                  { label: "Invoices", value: "1,284" },
                  { label: "Collection", value: "Rs. 3.6L" }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-end gap-2">
                  {[38, 52, 46, 70, 64, 84, 72].map((height, index) => (
                    <div key={index} className="flex-1">
                      <div
                        className="rounded-t-2xl bg-[linear-gradient(180deg,rgba(6,182,212,0.72),rgba(37,99,235,0.98))] shadow-[0_12px_26px_rgba(37,99,235,0.18)]"
                        style={{ height }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <FloatingCard
                icon={ReceiptIndianRupee}
                title="Collection Pulse"
                lines={[
                  ["Received", "Rs. 3.6L", "w-[85%]", "bg-emerald-500"],
                  ["Pending", "Rs. 92K", "w-[44%]", "bg-amber-500"],
                  ["Overdue", "Rs. 31K", "w-[22%]", "bg-rose-500"]
                ]}
              />
              <FloatingCard
                icon={CreditCard}
                title="Invoice Stream"
                simple
                lines={[
                  ["INV-2841", "Paid"],
                  ["INV-2842", "Partial"],
                  ["INV-2843", "Due"]
                ]}
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute -left-8 top-12 hidden rounded-[24px] bg-white px-4 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 md:block">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-[#2563EB]">
              <BarChart3 size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Sales Growth</p>
              <p className="mt-1 text-lg font-black text-slate-950">+18.4%</p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  </section>
);

const FloatingCard = ({
  title,
  icon: Icon,
  lines,
  simple = false
}: {
  title: string;
  icon: typeof ReceiptIndianRupee;
  lines: string[][];
  simple?: boolean;
}) => (
  <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.16),rgba(139,92,246,0.12))] text-[#2563EB]">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Module</p>
        <h4 className="mt-1 text-lg font-black text-slate-950">{title}</h4>
      </div>
    </div>

    <div className="mt-5 space-y-3">
      {simple
        ? lines.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
              <span className="text-sm font-bold text-slate-700">{label}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
                {value}
              </span>
            </div>
          ))
        : lines.map(([label, value, widthClass, tone]) => (
            <div key={label} className="rounded-[18px] bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="text-sm font-black text-slate-950">{value}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${tone} ${widthClass}`} />
              </div>
            </div>
          ))}
    </div>
  </div>
);

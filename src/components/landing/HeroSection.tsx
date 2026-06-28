import { ArrowRight, BadgeCheck, PlayCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "../../lib/framerMotionCompat";
import { Float, Reveal } from "./LandingMotion";

const heroStats = [
  { label: "Cash in pipeline", value: "Rs. 42.8L", change: "+12.4%" },
  { label: "Invoices this month", value: "1,284", change: "+8.1%" },
  { label: "Collection efficiency", value: "96.2%", change: "+3.2%" }
];

const ledgerRows = [
  { name: "Northline Retail", amount: "Rs. 4.8L", state: "Paid" },
  { name: "Atlas Trade", amount: "Rs. 2.1L", state: "Due" },
  { name: "Zenico Wholesale", amount: "Rs. 3.4L", state: "Partial" }
];

export const HeroSection = () => (
  <section className="relative mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl gap-14 px-4 pb-16 pt-14 md:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:pb-24">
    <div className="relative z-10">
      <Reveal>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#c8d8ff] bg-white/88 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#2451d8] shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <Sparkles size={14} />
          Premium finance orchestration for growth-stage businesses
        </div>

        <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.9] tracking-[-0.075em] text-slate-950 md:text-6xl lg:text-[5.3rem]">
          Finance operations,
          <br />
          <span className="bg-[linear-gradient(135deg,#1f4ed8,#2563eb,#38bdf8)] bg-clip-text text-transparent">
            orchestrated.
          </span>
        </h1>

        <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
          BizFinity brings billing, receivables, customers, inventory, communication, and leadership reporting into one polished command layer.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1f4ed8,#2563eb,#38bdf8)] px-7 py-4 text-sm font-black text-white shadow-[0_26px_56px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5"
          >
            Enter BizFinity
            <ArrowRight size={16} />
          </Link>
          <a
            href="#showcase"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/92 px-7 py-4 text-sm font-black text-slate-700 shadow-[0_18px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <PlayCircle size={18} />
            Explore product
          </a>
        </div>
      </Reveal>

      <Reveal className="mt-10 grid gap-3 sm:grid-cols-3" delay={0.08}>
        {heroStats.map((stat) => (
          <motion.div
            key={stat.label}
            className="rounded-[26px] border border-white/80 bg-white/84 p-5 shadow-[0_22px_52px_rgba(15,23,42,0.08)] backdrop-blur-xl"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.22 }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
            <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">{stat.value}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-emerald-600">
              <BadgeCheck size={14} />
              {stat.change}
            </p>
          </motion.div>
        ))}
      </Reveal>
    </div>

    <Reveal className="relative" delay={0.12}>
      <Float className="absolute -left-8 top-10 hidden md:block">
        <div className="h-28 w-28 rounded-full bg-cyan-200/55 blur-3xl" />
      </Float>
      <Float className="absolute right-0 top-24 hidden md:block" delay={0.5}>
        <div className="h-32 w-32 rounded-full bg-blue-200/60 blur-3xl" />
      </Float>

      <div className="relative overflow-hidden rounded-[38px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,248,255,0.92))] p-4 shadow-[0_48px_110px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <div className="rounded-[32px] border border-[#dbe6ff] bg-[#f5f8ff] p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/90 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Executive cockpit</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Revenue health overview</h3>
                </div>
                <div className="rounded-full bg-[linear-gradient(135deg,#1f4ed8,#38bdf8)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white">
                  Live sync
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  ["Net billed", "Rs. 84.2L"],
                  ["Open dues", "Rs. 9.8L"],
                  ["Collected", "Rs. 74.4L"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-100">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[26px] bg-[linear-gradient(180deg,#08152f,#122957)] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div className="flex items-end gap-2">
                  {[34, 48, 44, 66, 58, 82, 94, 76].map((height, index) => (
                    <div key={index} className="flex-1">
                      <motion.div
                        className="rounded-t-[18px] bg-[linear-gradient(180deg,#6ee7ff,#3b82f6)]"
                        initial={{ height: 16, opacity: 0.3 }}
                        whileInView={{ height, opacity: 1 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.6, delay: index * 0.04 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((month) => (
                    <span key={month}>{month}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <motion.div
                className="rounded-[28px] border border-white/90 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
                whileHover={{ y: -3 }}
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Receivables radar</p>
                <div className="mt-4 space-y-4">
                  {[
                    ["Collected", "78%", "bg-emerald-500"],
                    ["At risk", "14%", "bg-amber-500"],
                    ["Overdue", "8%", "bg-rose-500"]
                  ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-[20px] bg-slate-50 p-4 ring-1 ring-slate-100">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                        <span>{label}</span>
                        <span className="font-black text-slate-950">{value}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${tone}`} style={{ width: value }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="rounded-[28px] border border-white/90 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
                whileHover={{ y: -3 }}
              >
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Key accounts</p>
                <div className="mt-4 space-y-3">
                  {ledgerRows.map((row, index) => (
                    <div key={row.name} className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                      <div>
                        <p className="text-sm font-black text-slate-900">{row.name}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Invoice cluster {index + 1}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-950">{row.amount}</p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[#2451d8]">{row.state}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div
          className="absolute -left-2 bottom-8 hidden rounded-[22px] border border-white/90 bg-white/94 px-4 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.10)] md:block"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Overdue risk</p>
          <p className="mt-2 text-xl font-black tracking-[-0.03em] text-slate-950">7 accounts need action</p>
        </motion.div>
      </div>
    </Reveal>
  </section>
);

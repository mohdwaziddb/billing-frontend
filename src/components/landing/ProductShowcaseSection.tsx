import { motion } from "../../lib/framerMotionCompat";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { showcaseTabs } from "./landingData";

export const ProductShowcaseSection = () => (
  <LandingSectionFrame
    id="showcase"
    eyebrow="Product"
    title="An original showcase built around dashboard rhythm and premium visual density"
    description="The mock product surfaces below are intentionally custom to BizFinity while keeping the same quality bar for polish, spacing, and responsive composition."
  >
    <Reveal>
      <div className="overflow-hidden rounded-[38px] border border-white/80 bg-white/92 p-5 shadow-[0_36px_90px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap gap-2">
          {showcaseTabs.map((tab, index) => (
            <div
              key={tab}
              className={`rounded-full px-4 py-2 text-sm font-black ${index === 0 ? "bg-[linear-gradient(135deg,#1f4ed8,#38bdf8)] text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]" : "border border-slate-200 bg-white text-slate-500"}`}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-[30px] border border-[#d9e6ff] bg-[linear-gradient(180deg,#f8fbff,#f2f7ff)] p-5">
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[24px] border border-white/90 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Collections timeline</p>
                <div className="mt-4 h-40 rounded-[22px] bg-[linear-gradient(180deg,rgba(31,78,216,0.08),rgba(103,232,249,0.12),rgba(255,255,255,0.98))] p-4">
                  <div className="flex h-full items-end gap-3">
                    {[32, 48, 60, 44, 72, 92].map((height, index) => (
                      <motion.div
                        key={index}
                        className="flex-1 rounded-t-[16px] bg-[linear-gradient(180deg,#1f4ed8,#60a5fa)]"
                        initial={{ height: 12 }}
                        whileInView={{ height }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {["Growth accounts", "Delayed settlements", "Campaign impact"].map((item) => (
                    <div key={item} className="rounded-[18px] bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                      <p className="text-sm font-bold text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/90 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Account snapshot</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Top customer", "Northline Retail"],
                      ["Highest pending", "Rs. 2.8L"],
                      ["Average cycle", "18 days"],
                      ["Alerts today", "07"]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[18px] bg-slate-50 p-4 ring-1 ring-slate-100">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                        <p className="mt-3 text-lg font-black text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/90 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Invoice queue</p>
                  <div className="mt-4 space-y-3">
                    {[
                      ["INV-9021", "Ready to send"],
                      ["INV-9022", "Awaiting payment"],
                      ["INV-9023", "Follow-up scheduled"]
                    ].map(([name, state]) => (
                      <div key={name} className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                        <span className="text-sm font-black text-slate-900">{name}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#2451d8]">
                          {state}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {[
              "Customer collections cockpit",
              "Inventory movement intelligence",
              "Leadership-ready performance digest"
            ].map((title, index) => (
              <Reveal key={title} delay={index * 0.06}>
                <motion.div
                  className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,#ffffff,#f7fbff)] p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)]"
                  whileHover={{ y: -4 }}
                >
                  <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
                  <div className="mt-4 rounded-[22px] border border-slate-100 bg-white p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[16px] bg-slate-50 p-4 ring-1 ring-slate-100">
                        <div className="h-2 w-20 rounded-full bg-slate-200" />
                        <div className="mt-4 h-16 rounded-[14px] bg-[linear-gradient(180deg,rgba(31,78,216,0.12),rgba(103,232,249,0.12),rgba(255,255,255,0.98))]" />
                      </div>
                      <div className="space-y-3 rounded-[16px] bg-slate-50 p-4 ring-1 ring-slate-100">
                        {[0, 1, 2].map((row) => (
                          <div key={row} className="rounded-[14px] bg-white px-3 py-3 ring-1 ring-slate-100">
                            <div className="h-2 w-14 rounded-full bg-slate-200" />
                            <div className="mt-3 h-3 w-24 rounded-full bg-slate-300/70" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  </LandingSectionFrame>
);

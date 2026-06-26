import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";

const previewPanels = [
  "Dashboard",
  "Invoices",
  "Inventory",
  "Analytics"
];

export const ProductShowcaseSection = () => (
  <LandingSectionFrame
    eyebrow="Product Showcase"
    title="Realistic product previews designed to feel premium and trustworthy"
    description="The visual system reflects the product experience businesses expect: clean surfaces, meaningful hierarchy, and strong financial readability."
  >
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <Reveal>
        <div className="rounded-[36px] bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/80">
          <div className="rounded-[30px] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96),rgba(239,246,255,0.86))] p-5 ring-1 ring-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Preview</p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Management Dashboard</h3>
              </div>
              <div className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                Snapshot
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
              <div className="rounded-[26px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    "Net Sales",
                    "Pending Dues",
                    "Inventory Value"
                  ].map((label, index) => (
                    <div key={label} className="rounded-[20px] bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                      <div className={`mt-3 h-6 rounded-full ${index === 0 ? "bg-sky-500/80" : index === 1 ? "bg-violet-500/70" : "bg-cyan-500/70"}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[24px] bg-slate-50 p-4 ring-1 ring-slate-100">
                  <div className="flex h-40 items-end gap-3">
                    {[42, 72, 58, 92, 78, 108, 84].map((height, index) => (
                      <div key={index} className="flex-1">
                        <div
                          className={`rounded-t-[20px] ${index % 3 === 0 ? "bg-[linear-gradient(180deg,#60A5FA,#2563EB)]" : index % 3 === 1 ? "bg-[linear-gradient(180deg,#67E8F9,#06B6D4)]" : "bg-[linear-gradient(180deg,#C4B5FD,#8B5CF6)]"}`}
                          style={{ height }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Recent Invoices</p>
                  <div className="mt-4 space-y-3">
                    {["INV-8234", "INV-8235", "INV-8236"].map((invoice, index) => (
                      <div key={invoice} className="flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
                        <span className="text-sm font-black text-slate-900">{invoice}</span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${index === 0 ? "bg-emerald-50 text-emerald-700" : index === 1 ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
                          {index === 0 ? "Paid" : index === 1 ? "Partial" : "Issued"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Collection Mix</p>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <div className="h-28 w-28 rounded-full bg-[conic-gradient(#2563EB_0deg,#2563EB_150deg,#06B6D4_150deg,#06B6D4_270deg,#8B5CF6_270deg,#8B5CF6_360deg)] p-3">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-black text-slate-900">
                        100%
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        ["Online", "bg-[#2563EB]"],
                        ["Cash", "bg-[#06B6D4]"],
                        ["UPI", "bg-[#8B5CF6]"]
                      ].map(([label, tone]) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className={`h-3 w-3 rounded-full ${tone}`} />
                          <span className="text-sm font-bold text-slate-700">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        {previewPanels.map((panel, index) => (
          <Reveal key={panel} delay={index * 70}>
            <div className="rounded-[32px] bg-white p-5 shadow-[0_22px_54px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
              <div className="rounded-[26px] bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94),rgba(239,246,255,0.82))] p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{panel}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                    View
                  </span>
                </div>
                <div className="mt-4 rounded-[22px] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-slate-50 p-4 ring-1 ring-slate-100">
                      <div className="h-3 w-16 rounded-full bg-slate-200" />
                      <div className="mt-4 h-20 rounded-[16px] bg-[linear-gradient(180deg,rgba(37,99,235,0.12),rgba(6,182,212,0.08),rgba(255,255,255,0.95))]" />
                    </div>
                    <div className="space-y-3 rounded-[18px] bg-slate-50 p-4 ring-1 ring-slate-100">
                      {[0, 1, 2].map((row) => (
                        <div key={row} className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                          <div className="h-2 w-16 rounded-full bg-slate-200" />
                          <div className="mt-3 h-3 w-20 rounded-full bg-slate-300/70" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </LandingSectionFrame>
);

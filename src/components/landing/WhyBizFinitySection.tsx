import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { timelineSteps } from "./landingData";

export const WhyBizFinitySection = () => (
  <LandingSectionFrame
    id="solutions"
    eyebrow="Why BizFinity"
    title="A guided business journey with cleaner execution at every stage"
    description="From initial setup to invoice generation and reporting, the product flow is structured to reduce complexity and increase confidence."
  >
    <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
      <Reveal className="rounded-[34px] bg-[linear-gradient(145deg,rgba(37,99,235,0.08),rgba(6,182,212,0.10),rgba(139,92,246,0.08))] p-6 shadow-[0_22px_52px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
        <div className="rounded-[28px] bg-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Modern Illustration</p>
          <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">Business setup without operational clutter</h3>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            BizFinity is designed to feel calm, structured, and executive-ready while still serving high-frequency day-to-day usage.
          </p>
          <div className="mt-6 rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-100">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="h-3 w-20 rounded-full bg-slate-200" />
                <div className="mt-4 h-28 rounded-[18px] bg-[linear-gradient(180deg,rgba(37,99,235,0.14),rgba(6,182,212,0.14),rgba(255,255,255,0.96))]" />
              </div>
              <div className="space-y-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
                    <div className="h-2 w-16 rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-24 rounded-full bg-slate-300/70" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="space-y-4">
        {timelineSteps.map(({ title, description, icon: Icon }, index) => (
          <Reveal key={title} delay={index * 70}>
            <div className="relative rounded-[30px] bg-white px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.16),rgba(139,92,246,0.14))] text-[#2563EB]">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 ring-1 ring-slate-200">
                    Step {index + 1}
                  </div>
                  <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </LandingSectionFrame>
);

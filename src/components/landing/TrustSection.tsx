import { Counter, Reveal } from "./LandingMotion";
import { trustMetrics } from "./landingData";

export const TrustSection = () => (
  <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
    <Reveal className="rounded-[36px] bg-white px-6 py-6 shadow-[0_28px_64px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 md:px-8">
      <div className="grid gap-5 md:grid-cols-4">
        {trustMetrics.map((item) => (
          <div key={item.label} className="rounded-[28px] bg-slate-50 px-5 py-6 ring-1 ring-slate-100">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">
              {item.display ?? <Counter value={item.value} suffix={item.suffix} />}
            </p>
          </div>
        ))}
      </div>
    </Reveal>
  </section>
);

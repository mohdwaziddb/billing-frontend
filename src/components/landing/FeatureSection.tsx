import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { featureCards } from "./landingData";

export const FeatureSection = () => (
  <LandingSectionFrame
    id="features"
    eyebrow="Features"
    title="A polished operational suite, not a patchwork of tools"
    description="Every module is designed to support the speed, clarity, and trust modern businesses expect from premium SaaS software."
  >
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {featureCards.map(({ title, description, icon: Icon, accent }, index) => (
        <Reveal key={title} delay={index * 40}>
          <div className="group relative overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_64px_rgba(15,23,42,0.10)]">
            <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${accent}`} />
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.16),rgba(139,92,246,0.14))] text-[#2563EB]">
                <Icon size={28} />
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  </LandingSectionFrame>
);

import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { securityItems } from "./landingData";

export const SecuritySection = () => (
  <LandingSectionFrame
    id="security"
    eyebrow="Security"
    title="Protection built into the product experience"
    description="BizFinity is designed for serious business operations with a strong focus on access, isolation, traceability, and trusted handling of sensitive settings."
  >
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {securityItems.map(({ title, description, icon: Icon }, index) => (
        <Reveal key={title} delay={index * 50}>
          <div className="rounded-[30px] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.16),rgba(139,92,246,0.14))] text-[#2563EB]">
              <Icon size={24} />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          </div>
        </Reveal>
      ))}
    </div>
  </LandingSectionFrame>
);

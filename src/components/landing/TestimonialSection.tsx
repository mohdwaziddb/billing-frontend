import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { testimonials } from "./landingData";

export const TestimonialSection = () => (
  <LandingSectionFrame
    eyebrow="Testimonials"
    title="Professional teams want clarity, speed, and confidence"
    description="Placeholder references, but designed to reflect the kind of market trust a premium business platform should communicate."
  >
    <div className="grid gap-5 lg:grid-cols-3">
      {testimonials.map((item, index) => (
        <Reveal key={item.name} delay={index * 70}>
          <div className="rounded-[32px] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
            <div className="text-5xl font-black leading-none text-[#2563EB]/20">"</div>
            <p className="-mt-2 text-base leading-8 text-slate-600">{item.quote}</p>
            <div className="mt-6">
              <p className="text-lg font-black tracking-[-0.02em] text-slate-950">{item.name}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{item.role}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  </LandingSectionFrame>
);

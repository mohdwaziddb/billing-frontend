import { Building2, Globe2, Mail, MapPin, Phone } from "lucide-react";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";

const contactCards = [
  { label: "Email", value: "hello@bizfinity.in", icon: Mail },
  { label: "Phone", value: "+91 81307 03196", icon: Phone },
  { label: "Support", value: "24×7 Business Assistance", icon: Globe2 },
  { label: "Address", value: "BizFinity Technologies Pvt. Ltd.", icon: MapPin }
];

export const ContactSection = () => (
  <LandingSectionFrame
    id="contact"
    eyebrow="Contact"
    title="Designed to make a strong first impression before product exploration"
    description="A modern public front door for BizFinity that feels polished, enterprise-ready, and globally credible."
  >
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <Reveal>
        <div className="rounded-[36px] bg-[linear-gradient(145deg,rgba(37,99,235,0.10),rgba(6,182,212,0.10),rgba(139,92,246,0.10))] p-[1px] shadow-[0_28px_70px_rgba(15,23,42,0.08)]">
          <div className="rounded-[35px] bg-white px-7 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#2563EB,#06B6D4)] text-white shadow-[0_18px_34px_rgba(37,99,235,0.24)]">
              <Building2 size={26} />
            </div>
            <h3 className="mt-6 text-3xl font-black tracking-[-0.04em] text-slate-950">BizFinity Technologies Pvt. Ltd.</h3>
            <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
              The platform vision is simple: unify billing, inventory, customers, communication, reporting, and operational trust in one premium SaaS product.
            </p>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2">
        {contactCards.map(({ label, value, icon: Icon }, index) => (
          <Reveal key={label} delay={index * 50}>
            <div className="rounded-[30px] bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.16),rgba(139,92,246,0.14))] text-[#2563EB]">
                <Icon size={24} />
              </div>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
              <p className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">{value}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </LandingSectionFrame>
);

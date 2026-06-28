import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "../../lib/framerMotionCompat";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { contactCards } from "./landingData";

export const ContactSection = () => (
  <LandingSectionFrame
    id="contact"
    eyebrow="Contact"
    title="A stronger conversion close for founders, operators, and finance teams"
    description="The final section now feels like a deliberate premium CTA instead of a generic contact block."
  >
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <Reveal>
        <div className="overflow-hidden rounded-[36px] border border-[#d4e1ff] bg-[linear-gradient(135deg,#eef4ff,#f7fbff)] p-[1px] shadow-[0_30px_80px_rgba(15,23,42,0.09)]">
          <div className="rounded-[35px] bg-white/96 px-7 py-8 md:px-8 md:py-9">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#1f4ed8,#38bdf8)] text-white shadow-[0_20px_40px_rgba(37,99,235,0.24)]">
              <Building2 size={26} />
            </div>
            <h3 className="mt-6 text-3xl font-black tracking-[-0.05em] text-slate-950">Bring modern finance execution to the front of your business.</h3>
            <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
              BizFinity is now presented as a premium SaaS destination with stronger visual hierarchy, cleaner responsiveness, and a more enterprise-ready conversion journey.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f4ed8,#2563eb,#38bdf8)] px-6 py-3.5 text-sm font-black text-white shadow-[0_20px_40px_rgba(37,99,235,0.22)]"
              >
                Login to BizFinity
              </Link>
              <a
                href="mailto:hello@bizfinity.in"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-700"
              >
                Talk to the team
              </a>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2">
        {contactCards.map(({ label, value, icon: Icon }, index) => (
          <motion.div
            key={label}
            className="rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.07)]"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.52, delay: index * 0.05 }}
            whileHover={{ y: -4 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(31,78,216,0.12),rgba(56,189,248,0.16),rgba(125,211,252,0.14))] text-[#2451d8]">
              <Icon size={24} />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className="mt-3 text-lg font-black tracking-[-0.02em] text-slate-950">{value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </LandingSectionFrame>
);

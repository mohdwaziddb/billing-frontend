import { motion } from "../../lib/framerMotionCompat";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { securityItems } from "./landingData";

export const SecuritySection = () => (
  <LandingSectionFrame
    id="security"
    eyebrow="Security"
    title="Security cues are treated as product substance, not decorative reassurance"
    description="The section below uses stronger enterprise framing while staying visually clean, responsive, and aligned with the rest of the page."
  >
    <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
      <Reveal>
        <div className="rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,#09162f,#132955)] p-6 text-white shadow-[0_34px_90px_rgba(15,23,42,0.14)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Trust posture</p>
          <h3 className="mt-4 text-3xl font-black tracking-[-0.05em]">Designed to support serious business handling from day one</h3>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            The visual treatment signals confidence without turning the section into a wall of compliance jargon.
          </p>
          <div className="mt-6 space-y-3">
            {["Role-aware screens", "Traceable business actions", "Protected provider settings"].map((item) => (
              <div key={item} className="rounded-[18px] border border-white/10 bg-white/8 px-4 py-4">
                <p className="text-sm font-bold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {securityItems.map(({ title, description, icon: Icon }, index) => (
          <motion.div
            key={title}
            className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_22px_60px_rgba(15,23,42,0.07)]"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.52, delay: index * 0.04 }}
            whileHover={{ y: -4 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(31,78,216,0.12),rgba(56,189,248,0.16),rgba(125,211,252,0.14))] text-[#2451d8]">
              <Icon size={24} />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </LandingSectionFrame>
);

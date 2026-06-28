import { motion } from "../../lib/framerMotionCompat";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { operatingPillars, solutionStream } from "./landingData";

export const WhyBizFinitySection = () => (
  <LandingSectionFrame
    id="solutions"
    eyebrow="Solutions"
    title="A landing page narrative shaped around business momentum, not generic feature dumping"
    description="Each section frames BizFinity as a premium operating environment with strong hierarchy, clearer commercial intent, and enterprise-grade trust cues."
    align="left"
  >
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <Reveal>
        <div className="overflow-hidden rounded-[36px] border border-white/80 bg-white/90 p-6 shadow-[0_28px_72px_rgba(15,23,42,0.08)]">
          <div className="rounded-[28px] bg-[linear-gradient(160deg,#08152f,#173566)] p-6 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Design principle</p>
            <h3 className="mt-4 text-3xl font-black tracking-[-0.05em]">Calm surfaces for high-stakes workflows</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The page uses generous spacing, asymmetrical composition, and structured visual pacing to feel premium without mirroring the reference layout.
            </p>
            <div className="mt-6 space-y-4">
              {operatingPillars.map(({ title, description, icon: Icon, metric }, index) => (
                <motion.div
                  key={title}
                  className="rounded-[24px] border border-white/10 bg-white/8 p-4 backdrop-blur-xl"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-white/10 text-cyan-200">
                      <Icon size={22} />
                    </div>
                    <div>
                      <div className="inline-flex rounded-full border border-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-200">
                        {metric}
                      </div>
                      <h4 className="mt-3 text-xl font-black tracking-[-0.03em] text-white">{title}</h4>
                      <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4">
        {solutionStream.map(({ eyebrow, title, description, icon: Icon }, index) => (
          <Reveal key={title} delay={index * 0.06}>
            <motion.div
              className="rounded-[30px] border border-white/80 bg-white/90 px-6 py-6 shadow-[0_22px_60px_rgba(15,23,42,0.07)]"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.22 }}
            >
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(31,78,216,0.12),rgba(56,189,248,0.16),rgba(125,211,252,0.14))] text-[#2451d8]">
                  <Icon size={24} />
                </div>
                <div>
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {eyebrow}
                  </div>
                  <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </div>
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </div>
  </LandingSectionFrame>
);

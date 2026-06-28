import { motion } from "../../lib/framerMotionCompat";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { featureHighlights } from "./landingData";

export const FeatureSection = () => (
  <LandingSectionFrame
    id="features"
    eyebrow="Platform"
    title="The operational layer between transaction volume and leadership clarity"
    description="This is not a collection of disconnected utilities. BizFinity is framed as one original system for commercial teams that need speed, polish, and control."
  >
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Reveal>
        <div className="grid gap-5 md:grid-cols-2">
          {featureHighlights.slice(0, 4).map(({ title, description, icon: Icon, accent }, index) => (
            <motion.div
              key={title}
              className="group relative overflow-hidden rounded-[32px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.07)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.54, delay: index * 0.06 }}
              whileHover={{ y: -5 }}
            >
              <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${accent}`} />
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(31,78,216,0.12),rgba(56,189,248,0.16),rgba(125,211,252,0.14))] text-[#2451d8]">
                  <Icon size={28} />
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-5">
        <Reveal delay={0.08}>
          <div className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,#0a1731,#12274f)] p-6 text-white shadow-[0_34px_90px_rgba(15,23,42,0.16)]">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">Operating model</p>
            <h3 className="mt-4 text-3xl font-black tracking-[-0.05em]">Built for the people carrying daily revenue pressure</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              BizFinity keeps finance leadership, collections workflows, and customer-facing operations in one visual rhythm.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "A single source of truth for billing and collections",
                "Readable analytics without spreadsheet fatigue",
                "Communication channels embedded into the workflow"
              ].map((item) => (
                <div key={item} className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4">
                  <p className="text-sm font-bold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="grid gap-5 sm:grid-cols-2">
            {featureHighlights.slice(4).map(({ title, description, icon: Icon, accent }, index) => (
              <motion.div
                key={title}
                className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.07)]"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.54, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${accent}`} />
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(31,78,216,0.12),rgba(56,189,248,0.16),rgba(125,211,252,0.14))] text-[#2451d8]">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  </LandingSectionFrame>
);

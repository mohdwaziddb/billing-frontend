import { Bot } from "lucide-react";
import { motion } from "../../lib/framerMotionCompat";
import { Reveal } from "./LandingMotion";
import { aiCapabilities } from "./landingData";

export const AISection = () => (
  <section className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6 lg:py-24">
    <Reveal>
      <div className="overflow-hidden rounded-[40px] border border-[#c9ddff] bg-[linear-gradient(135deg,#eef4ff,#edf8ff,#f8fbff)] p-[1px] shadow-[0_36px_90px_rgba(15,23,42,0.10)]">
        <div className="rounded-[39px] bg-[linear-gradient(160deg,#0b1833,#14315d,#1e4480)] px-7 py-8 text-white md:px-10 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
                <Bot size={14} />
                AI layer
              </div>
              <h2 className="mt-6 text-4xl font-black tracking-[-0.06em] md:text-5xl">An intelligent support layer for finance-heavy workflows</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                The AI section is now original to BizFinity: positioned as an executive co-pilot for summaries, guidance, and operational prompts rather than a copied visual gimmick.
              </p>
              <div className="mt-6 inline-flex rounded-full border border-white/12 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100">
                Planned capability set
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {aiCapabilities.map(({ title, description, icon: Icon }, index) => (
                <motion.div
                  key={title}
                  className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-xl"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.52, delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/10 text-cyan-100">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  </section>
);

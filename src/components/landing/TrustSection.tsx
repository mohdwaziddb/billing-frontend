import { motion } from "../../lib/framerMotionCompat";
import { Counter, Reveal } from "./LandingMotion";
import { trustMetrics } from "./landingData";

export const TrustSection = () => (
  <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
    <Reveal>
      <div className="rounded-[36px] border border-white/80 bg-white/88 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {trustMetrics.map((item, index) => (
            <motion.div
              key={item.label}
              className="rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] px-5 py-6"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">
                <Counter value={item.value} suffix={item.suffix} />
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </Reveal>
  </section>
);

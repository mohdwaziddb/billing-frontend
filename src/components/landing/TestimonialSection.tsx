import { motion } from "../../lib/framerMotionCompat";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { testimonials } from "./landingData";

export const TestimonialSection = () => (
  <LandingSectionFrame
    eyebrow="Proof"
    title="The page now speaks in the language of teams who care about control and polish"
    description="These testimonials are still placeholder-style social proof, but the structure now feels more premium, readable, and aligned with the brand direction."
  >
    <div className="grid gap-5 lg:grid-cols-3">
      {testimonials.map((item, index) => (
        <motion.div
          key={item.name}
          className="rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.07)]"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.52, delay: index * 0.05 }}
          whileHover={{ y: -4 }}
        >
          <div className="text-5xl font-black leading-none text-[#2451d8]/20">"</div>
          <p className="-mt-1 text-base leading-8 text-slate-600">{item.quote}</p>
          <div className="mt-7">
            <p className="text-lg font-black tracking-[-0.03em] text-slate-950">{item.name}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{item.role}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </LandingSectionFrame>
);

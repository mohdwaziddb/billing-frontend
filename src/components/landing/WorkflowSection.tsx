import { motion } from "../../lib/framerMotionCompat";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { workflowSteps } from "./landingData";

export const WorkflowSection = () => (
  <LandingSectionFrame
    eyebrow="Workflow"
    title="The workflow is paced like a revenue engine, not a disconnected checklist"
    description="BizFinity’s public experience now mirrors the way teams actually move from demand to billing to collections to management visibility."
  >
    <div className="grid gap-5 lg:grid-cols-4">
      {workflowSteps.map(({ title, description, icon: Icon }, index) => (
        <motion.div
          key={title}
          className="relative rounded-[30px] border border-white/80 bg-white/90 px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.07)]"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, delay: index * 0.06 }}
          whileHover={{ y: -4 }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(31,78,216,0.12),rgba(56,189,248,0.16),rgba(125,211,252,0.14))] text-[#2451d8]">
            <Icon size={24} />
          </div>
          <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Phase {index + 1}
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        </motion.div>
      ))}
    </div>
  </LandingSectionFrame>
);

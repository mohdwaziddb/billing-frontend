import { LandingSectionFrame } from "./LandingSectionFrame";
import { Reveal } from "./LandingMotion";
import { workflowSteps } from "./landingData";

export const WorkflowSection = () => (
  <LandingSectionFrame
    eyebrow="Workflow"
    title="A clean process from transaction to growth"
    description="Customer relationships, invoicing, payments, and reporting move in one continuous operational path."
  >
    <Reveal>
      <div className="rounded-[36px] bg-white px-6 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
        <div className="grid gap-5 lg:grid-cols-5">
          {workflowSteps.map((step, index) => (
            <div key={step} className="relative">
              <div className="rounded-[28px] bg-slate-50 px-5 py-6 text-center ring-1 ring-slate-100">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#DBEAFE,#CFFAFE,#EDE9FE)] text-sm font-black text-[#2563EB]">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-slate-950">{step}</h3>
              </div>
              {index < workflowSteps.length - 1 ? (
                <div className="hidden lg:absolute lg:right-[-18px] lg:top-1/2 lg:block lg:-translate-y-1/2">
                  <div className="h-[2px] w-9 bg-[linear-gradient(90deg,#2563EB,#06B6D4,#8B5CF6)]" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  </LandingSectionFrame>
);

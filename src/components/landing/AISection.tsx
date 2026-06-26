import { Bot, BrainCircuit, Mic2, Radar, ScrollText } from "lucide-react";
import { Reveal } from "./LandingMotion";

const items = [
  { title: "Natural Language Billing", icon: BrainCircuit },
  { title: "Voice Commands", icon: Mic2 },
  { title: "Business Insights", icon: Radar },
  { title: "Smart Reports", icon: ScrollText }
];

export const AISection = () => (
  <section className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6">
    <Reveal>
      <div className="overflow-hidden rounded-[40px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.14),rgba(139,92,246,0.14),rgba(255,255,255,0.95))] p-[1px] shadow-[0_34px_90px_rgba(15,23,42,0.10)]">
        <div className="rounded-[39px] bg-[linear-gradient(160deg,#F8FBFF,#F4F9FF,#F8FAFF)] px-7 py-8 md:px-10 md:py-10">
          <div className="grid gap-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#2563EB] shadow-sm ring-1 ring-slate-200/80">
                <Bot size={14} />
                AI Section
              </div>
              <h2 className="mt-6 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
                BizFinity AI Assistant
              </h2>
              <div className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
                Coming Soon
              </div>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
                BizFinity is being prepared for assistant-led workflows, voice-first operations, natural language billing, and smarter business visibility without exposing unfinished functionality today.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {items.map(({ title, icon: Icon }, index) => (
                <Reveal key={title} delay={index * 60}>
                  <div className="rounded-[28px] bg-white/88 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] ring-1 ring-white/80 backdrop-blur-xl">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.16),rgba(139,92,246,0.14))] text-[#2563EB]">
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-slate-950">{title}</h3>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  </section>
);

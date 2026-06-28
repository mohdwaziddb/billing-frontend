import type { PropsWithChildren } from "react";
import { Reveal } from "./LandingMotion";

export const LandingSectionFrame = ({
  eyebrow,
  title,
  description,
  children,
  id,
  align = "center"
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
  align?: "left" | "center";
}>) => (
  <section id={id} className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6 lg:py-24">
    <Reveal className={align === "left" ? "mb-12 max-w-3xl" : "mb-12 text-center"}>
      <div className="inline-flex rounded-full border border-[#c8d8ff] bg-white/88 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#2451d8] shadow-[0_12px_30px_rgba(36,81,216,0.08)]">
        {eyebrow}
      </div>
      <h2 className={`mt-5 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-5xl ${align === "center" ? "mx-auto max-w-4xl" : ""}`}>
        {title}
      </h2>
      {description ? (
        <p className={`mt-5 text-base leading-8 text-slate-600 md:text-lg ${align === "center" ? "mx-auto max-w-3xl" : ""}`}>
          {description}
        </p>
      ) : null}
    </Reveal>
    {children}
  </section>
);

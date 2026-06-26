import type { PropsWithChildren } from "react";
import { Reveal } from "./LandingMotion";

export const LandingSectionFrame = ({
  eyebrow,
  title,
  description,
  children,
  id
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
}>) => (
  <section id={id} className="mx-auto w-full max-w-7xl px-4 py-20 md:px-6">
    <Reveal className="mb-12 text-center">
      <p className="text-sm font-black uppercase tracking-[0.34em] text-[#2563EB]">{eyebrow}</p>
      <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
        {title}
      </h2>
      {description ? <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600">{description}</p> : null}
    </Reveal>
    {children}
  </section>
);

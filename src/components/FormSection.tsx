import type { ReactNode } from "react";
import clsx from "clsx";
import { GlassCard } from "./GlassCard";

export const FormSection = ({
  title,
  children,
  className,
  contentClassName
}: {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) => {
  return (
    <GlassCard className={clsx("p-4 md:p-5", className)}>
      <h3 className="fs-11 font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      <div className={clsx("mt-3", contentClassName)}>{children}</div>
    </GlassCard>
  );
};

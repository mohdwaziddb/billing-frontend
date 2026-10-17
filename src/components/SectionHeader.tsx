import type { ReactNode } from "react";
import clsx from "clsx";

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className
}: {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) => {
  return (
    <div className={clsx("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="fs-11 font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
        ) : null}
        {title ? <h2 className="mt-1 fs-18 font-semibold text-slate-950">{title}</h2> : null}
        {description ? <p className="mt-1 fs-12 text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
};

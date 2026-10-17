import type { ReactNode } from "react";
import clsx from "clsx";
import { Inbox } from "lucide-react";

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className
}: {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3 px-4 py-10 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
        {icon ?? <Inbox size={24} />}
      </span>
      {title ? <p className="fs-13 font-semibold text-slate-600">{title}</p> : null}
      {description ? <p className="fs-12 text-slate-500">{description}</p> : null}
      {action}
    </div>
  );
};

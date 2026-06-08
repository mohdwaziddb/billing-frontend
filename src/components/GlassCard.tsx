import type { ReactNode } from "react";
import clsx from "clsx";

export const GlassCard = ({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) => {
  return <div className={clsx("billing-card", className)}>{children}</div>;
};

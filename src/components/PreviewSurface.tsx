import type { ReactNode } from "react";
import clsx from "clsx";

export const PreviewSurface = ({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={clsx("preview-surface rounded-[var(--radius-card)] border p-4", className)}
    style={{
      backgroundColor: "var(--preview-bg)",
      color: "var(--preview-text)",
      borderColor: "var(--preview-border)"
    }}
  >
    {children}
  </div>
);

import type { ReactNode } from "react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type InfoNoteTone = "info" | "warning" | "success";

const toneClasses: Record<InfoNoteTone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800"
};

const toneIcons: Record<InfoNoteTone, ReactNode> = {
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
  success: <CheckCircle2 size={16} />
};

/** Page/form ke andar chhota inline note (read-only wajah, hint, warning) — har page apna div na banaye. */
export const InfoNote = ({
  tone = "info",
  children,
  className
}: {
  tone?: InfoNoteTone;
  children: ReactNode;
  className?: string;
}) => (
  <div className={clsx("flex items-start gap-2 rounded-lg border px-3 py-2 fs-12", toneClasses[tone], className)}>
    <span className="mt-px shrink-0">{toneIcons[tone]}</span>
    <div className="min-w-0">{children}</div>
  </div>
);

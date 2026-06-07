import type { ReactNode } from "react";
import { X } from "lucide-react";
import { GlassCard } from "./GlassCard";

export const Modal = ({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <GlassCard className="w-full max-w-6xl p-6 md:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Details</p>
              <h3 className="mt-2 text-xl font-bold text-white">{title}</h3>
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
          <div className="min-w-0">{children}</div>
        </GlassCard>
      </div>
    </div>
  );
};

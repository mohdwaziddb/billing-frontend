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
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Record Details</p>
              <h3 className="card-title mt-2 text-xl text-slate-950">{title}</h3>
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
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

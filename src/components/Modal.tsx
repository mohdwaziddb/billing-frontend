import type { ReactNode } from "react";
import { Button } from "./Button";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <GlassCard className="w-full max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </GlassCard>
    </div>
  );
};

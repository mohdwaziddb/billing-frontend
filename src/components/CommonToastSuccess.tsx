import { CheckCircle2, X } from "lucide-react";
import type { AppNotification } from "../services/notificationService";

export const CommonToastSuccess = ({ notification, onClose }: { notification: AppNotification; onClose: () => void }) => (
  <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-card)] border border-emerald-600 bg-emerald-600 px-4 py-3 text-sm text-white shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
    <CheckCircle2 className="mt-0.5 shrink-0 text-white" size={18} />
    <p className="min-w-0 flex-1 font-semibold">{notification.message}</p>
    <button type="button" className="shrink-0 text-white/80 transition hover:text-white" aria-label="Close notification" onClick={onClose}>
      <X size={16} />
    </button>
  </div>
);

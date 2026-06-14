import { X } from "lucide-react";
import { CommonDeleteIcon } from "./CommonDeleteAction";
import { Button } from "./Button";
import { GlassCard } from "./GlassCard";

export const CommonDeleteModal = ({
  open,
  loading = false,
  onCancel,
  onConfirm
}: {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <GlassCard className="w-full max-w-md p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-300/20 bg-rose-500/12 text-rose-100">
                <CommonDeleteIcon size={19} />
              </div>
              <div>
                <h3 className="card-title text-lg text-slate-950">Confirm Delete</h3>
                <p className="mt-2 text-sm text-slate-600">Do you want to delete this record?</p>
              </div>
            </div>
            <button type="button" className="text-slate-400 transition hover:text-slate-950" aria-label="Close dialog" onClick={onCancel}>
              <X size={18} />
            </button>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={loading} onClick={onConfirm}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

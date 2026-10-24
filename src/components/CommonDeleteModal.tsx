import { CommonDeleteIcon } from "./CommonDeleteAction";
import { Button } from "./Button";
import { Modal } from "./Modal";

export const CommonDeleteModal = ({
  open,
  loading = false,
  title = "Confirm Delete",
  description,
  itemName,
  softDelete = false,
  confirmLabel = "Delete",
  onCancel,
  onConfirm
}: {
  open: boolean;
  loading?: boolean;
  title?: string;
  description?: string;
  /** Record ka naam — message me dikhta hai taaki galat row delete na ho. */
  itemName?: string;
  /** Backend sirf inactive karta hai: user ko batao ki baad me wapas active ho sakta hai. */
  softDelete?: boolean;
  /** Disable/Deactivate jaise actions ke liye button text. */
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const message = description
    ?? (itemName ? `Do you want to delete "${itemName}"?` : "Do you want to delete this record?");
  return (
    <Modal open={open} title={title} eyebrow={`Confirm ${confirmLabel}`} maxWidthClass="max-w-md" onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-500/15 bg-rose-500/10 text-rose-600 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300">
          <CommonDeleteIcon size={19} />
        </div>
        <div className="mt-1 min-w-0 space-y-1.5">
          <p className="break-words text-sm text-slate-700 dark:text-slate-200">{message}</p>
          {softDelete ? (
            <p className="fs-12 text-slate-500">It will be marked Inactive and hidden from new entries. Records already using it are not changed, and you can reactivate it from the Status filter.</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={loading} onClick={onConfirm}>
          {loading ? (confirmLabel === "Delete" ? "Deleting..." : "Please wait...") : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

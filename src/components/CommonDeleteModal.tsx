import { CommonDeleteIcon } from "./CommonDeleteAction";
import { Button } from "./Button";
import { Modal } from "./Modal";

export const CommonDeleteModal = ({
  open,
  loading = false,
  title = "Confirm Delete",
  description = "Do you want to delete this record?",
  onCancel,
  onConfirm
}: {
  open: boolean;
  loading?: boolean;
  title?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <Modal open={open} title={title} eyebrow="Confirm Delete" maxWidthClass="max-w-md" onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-500/15 bg-rose-500/10 text-rose-600 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300">
          <CommonDeleteIcon size={19} />
        </div>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{description}</p>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={loading} onClick={onConfirm}>
          {loading ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </Modal>
  );
};

import { CommonDeleteModal } from "./CommonDeleteModal";

type BulkDeleteModalProps = {
  open: boolean;
  loading: boolean;
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export const BulkDeleteModal = ({ open, loading, selectedCount, onCancel, onConfirm }: BulkDeleteModalProps) => (
  <CommonDeleteModal
    open={open}
    loading={loading}
    onCancel={onCancel}
    onConfirm={onConfirm}
    title={`Delete ${selectedCount} selected record${selectedCount === 1 ? "" : "s"}`}
    description={`This action will permanently delete ${selectedCount} selected record${selectedCount === 1 ? "" : "s"}. Are you sure you want to continue?`}
  />
);
